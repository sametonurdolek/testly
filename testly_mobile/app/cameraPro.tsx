// app/cameraPro.tsx
import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  FlashMode,
  FocusMode,
  VideoQuality,
} from "expo-camera";
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Button,
  Pressable,
  Text,
  View,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import type { PressableProps } from "react-native";
import { Image } from "expo-image";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuestions } from "../src/QuestionsContext";

export default function App() {
  // İzinler
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const ref = useRef<CameraView>(null);
  const router = useRouter();
  const { folder } = useLocalSearchParams<{ folder?: string }>();
  const targetFolder = (folder && String(folder).trim()) || "Genel";

  // Context
  const { addQuestion } = useQuestions();

  // Tek kamera kuralı
  const [screenActive, setScreenActive] = useState(true);
  const [cameraKey, setCameraKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setScreenActive(true);
      setCameraKey((k) => k + 1); // her fokus’ta yeni instance
      return () => {
        setScreenActive(false);
        setTorch(false);
      };
    }, [])
  );

  // Kamera durumu
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [torch, setTorch] = useState(false);
  const [autofocus, setAutofocus] = useState<FocusMode>("on");
  const [zoom, setZoom] = useState(0);
  const [mirror, setMirror] = useState(false);

  // Kalite
  const [videoQuality] = useState<VideoQuality>("1080p");
  const [videoBitrate] = useState<number>(10_000_000);
  const [ratio] = useState<string>("16:9");
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);

  // Özellik
  const [toggleRecAvailable, setToggleRecAvailable] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(false);

  // Çekimler ve seçim
  const [shots, setShots] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedCount = selected.size;

  useEffect(() => {
    if (mode === "video" && Platform.OS !== "web" && !micPerm?.granted) {
      requestMicPerm?.();
    }
  }, [mode]);

  if (!camPerm) return null;
  if (!camPerm.granted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "black" }}>
        <Text style={{ color: "white", marginBottom: 8, textAlign: "center" }}>
          Kamerayı kullanmak için izin gerekli
        </Text>
        <Button onPress={requestCamPerm} title="Kamera izni ver" />
      </View>
    );
  }

  // ------- helpers -------
  const ensureDir = async (dir: string) => {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  };

  const saveToAppStorage = async (fromUri: string) => {
    if (Platform.OS === "web") return fromUri;
    const dir = FileSystem.documentDirectory! + "photos";
    await ensureDir(dir);
    const to = `${dir}/${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: fromUri, to });
    return to;
  };

  const onCameraReady = async () => {
    try {
      const features = await ref.current?.getSupportedFeatures();
      setToggleRecAvailable(!!features?.toggleRecordingAsyncAvailable);
      // pictureSize seçimi şimdilik kapalı
    } catch {}
  };

  const onMountError = (e: any) => {
    Alert.alert("Kamera açılamadı", e?.message ?? "Bilinmeyen hata");
  };

  const onBarcodeScanned = (r: { data: string; type: string }) => {
    if (!scanEnabled) return;
    setScanEnabled(false);
    Alert.alert("Barkod", `${r.type}\n${r.data}`);
  };

  // ------- actions -------
  const takePicture = async () => {
    const photo = await ref.current?.takePictureAsync({
      quality: 1,
      exif: true,
      base64: Platform.OS === "web",
    });
    if (!photo?.uri) return;
    const stored = await saveToAppStorage(photo.uri);
    setShots((prev) => [stored, ...prev]);
    setSelected((prev) => new Set(prev).add(stored));
  };

  const startRecord = async () => {
    setRecording(true);
    try {
      const video = await ref.current?.recordAsync({
        maxDuration: 60,
        maxFileSize: 150 * 1024 * 1024,
      });
      if (video?.uri) Alert.alert("Video", video.uri);
    } finally {
      setRecording(false);
    }
  };

  const stopRecord = () => {
    ref.current?.stopRecording();
    setRecording(false);
  };

  const toggleRecording = async () => {
    if (toggleRecAvailable) {
      // @ts-ignore
      await ref.current?.toggleRecordingAsync();
      setRecording((r) => !r);
    } else {
      if (recording) stopRecord();
      else await startRecord();
    }
  };

  // ------- toggles -------
  const toggleMode = () => setMode((p) => (p === "picture" ? "video" : "picture"));
  const toggleFacing = () => setFacing((p) => (p === "back" ? "front" : "back"));
  const cycleFlash = () => setFlash((f) => (f === "off" ? "on" : f === "on" ? "auto" : "off"));
  const toggleTorch = () => setTorch((t) => !t);
  const toggleAF = () => setAutofocus((a) => (a === "on" ? "off" : "on"));
  const bumpZoom = (d: number) => setZoom((z) => Math.min(1, Math.max(0, +(z + d).toFixed(3))));

  // ------- selection -------
  const toggleSelect = (u: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(u)) n.delete(u);
      else n.add(u);
      return n;
    });
  };

  const proceed = () => {
    if (selectedCount === 0) return;
    selected.forEach((u) => addQuestion(targetFolder, u, "A"));
    router.replace({ pathname: "/(tabs)/questions", params: { folder: targetFolder } });
  };

  // ------- UI controls -------
  const IconBtn: React.FC<PressableProps & { children: React.ReactNode }> = ({
    children,
    style,
    ...props
  }) => (
    <Pressable
      {...props}
      style={({ pressed }) => [
        {
          borderRadius: 9999,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
          backgroundColor: "rgba(255,255,255,0.1)",
          padding: 10,
        },
        pressed ? { opacity: 0.6 } : null,
        style as any,
      ]}
    >
      {children}
    </Pressable>
  );

  const shutterInnerStyle =
    mode === "picture"
      ? { width: 80, height: 80, borderRadius: 9999, backgroundColor: "white" }
      : recording
      ? { width: 80, height: 80, borderRadius: 9999, backgroundColor: "#6b7280" }
      : { width: 80, height: 80, borderRadius: 9999, backgroundColor: "#dc2626" };

  const Controls = () => (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" }}
    >
      {/* Alt: çekim şeridi */}
      {shots.length > 0 && (
        <View style={{ marginBottom: 160, paddingHorizontal: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {shots.map((u) => {
              const isSel = selected.has(u);
              return (
                <Pressable key={u} onPress={() => toggleSelect(u)} style={{ marginRight: 8 }}>
                  <View
                    style={{
                      overflow: "hidden",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSel ? "#3b82f6" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <Image source={{ uri: u }} style={{ width: 64, height: 96 }} />
                  </View>
                  <View style={{ position: "absolute", right: 4, top: 4 }}>
                    {isSel ? (
                      <Feather name="check-circle" size={18} color="#3b82f6" />
                    ) : (
                      <Feather name="circle" size={18} color="#ffffff99" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Alt: ana kontrol paneli */}
      <View
        style={{
          minHeight: 140,
          backgroundColor: "rgba(0,0,0,0.6)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 12,
          paddingBottom: 28,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Sol grup */}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 16 }}>
            <IconBtn onPress={toggleMode}>
              {mode === "picture" ? (
                <AntDesign name="picture" size={22} color="white" />
              ) : (
                <Feather name="video" size={22} color="white" />
              )}
            </IconBtn>

            <IconBtn onPress={cycleFlash}>
              <Feather name="zap" size={22} color={flash === "off" ? "gray" : "white"} />
            </IconBtn>

            <IconBtn onPress={toggleAF}>
              <Feather name="crosshair" size={22} color={autofocus === "on" ? "white" : "gray"} />
            </IconBtn>
          </View>

          {/* Ortadaki deklanşör */}
          <View style={{ width: 112, alignItems: "center", justifyContent: "center" }}>
            <Pressable
              onPress={mode === "picture" ? takePicture : toggleRecording}
              disabled={mode === "video" && !micPerm?.granted && Platform.OS !== "web"}
              style={({ pressed }) => [
                {
                  width: 96,
                  height: 96,
                  borderRadius: 9999,
                  borderWidth: 4,
                  borderColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                },
                pressed ? { opacity: 0.5 } : null,
              ]}
            >
              <View style={shutterInnerStyle} />
            </Pressable>
          </View>

          {/* Sağ grup */}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 16 }}>
            <IconBtn onPress={toggleFacing}>
              <FontAwesome6 name="rotate-left" size={22} color="white" />
            </IconBtn>

            <IconBtn onPress={toggleTorch}>
              <Feather name="sun" size={22} color={torch ? "white" : "gray"} />
            </IconBtn>

            <IconBtn onPress={() => bumpZoom(+0.1)}>
              <Feather name="zoom-in" size={22} color="white" />
            </IconBtn>

            <IconBtn onPress={() => bumpZoom(-0.1)}>
              <Feather name="zoom-out" size={22} color="white" />
            </IconBtn>

            <IconBtn onPress={() => setScanEnabled((s) => !s)}>
              <Feather name="maximize" size={22} color={scanEnabled ? "white" : "gray"} />
            </IconBtn>
          </View>
        </View>
      </View>
    </View>
  );

  // Kamera + overlay
  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* Üst bar */}
      <SafeAreaView edges={["top"]} style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "white", fontWeight: "600" }}>
            {targetFolder} • Seçili: {selectedCount}
          </Text>

          <TouchableOpacity
            onPress={proceed}
            disabled={selectedCount === 0}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              backgroundColor: selectedCount === 0 ? "rgba(255,255,255,0.3)" : "#2563eb",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Devam et</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Kamera + overlay */}
      <View style={{ flex: 1, position: "relative" }}>
        {screenActive ? (
          <CameraView
            key={cameraKey}
            ref={ref}
            style={StyleSheet.absoluteFill}
            mode={mode}
            facing={facing}
            flash={flash}
            enableTorch={torch}
            autofocus={autofocus}
            zoom={zoom}
            mute={false}
            onCameraReady={onCameraReady}
            onMountError={onMountError}
            {...(scanEnabled
              ? {
                  onBarcodeScanned: onBarcodeScanned,
                  barcodeScannerSettings: { barcodeTypes: ["qr"] },
                }
              : {})}
          />
        ) : null}

        <Controls />
      </View>
    </View>
  );
}
