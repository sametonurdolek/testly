import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  FlashMode,
  FocusMode,
  VideoQuality,
  CameraRatio,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuestions } from "../src/QuestionsContext";
// Import the new object-oriented FileSystem API. The legacy
// `expo-file-system` module has been replaced with an OOP API in
// SDK 54. See the changelog for more details【963569638619089†L367-L375】.
import { File, Directory, Paths } from "expo-file-system";

export default function App() {
  // Permissions
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const ref = useRef<CameraView>(null);
  const router = useRouter();
  const { folder } = useLocalSearchParams<{ folder?: string }>();
  const targetFolder = (folder && String(folder).trim()) || "Genel";

  // Context
  const { addQuestion } = useQuestions();

  // Enforce a single camera instance while the screen is active
  const [screenActive, setScreenActive] = useState(true);
  const [cameraKey, setCameraKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setScreenActive(true);
      setCameraKey((k) => k + 1); // new instance on each focus
      return () => {
        setScreenActive(false);
        setTorch(false);
      };
    }, [])
  );

  // Camera state
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [torch, setTorch] = useState(false);
  const [autofocus, setAutofocus] = useState<FocusMode>("on");
  const [zoom, setZoom] = useState(0);
  const [mirror, setMirror] = useState(false);

  // Quality
  const [videoQuality] = useState<VideoQuality>("1080p");
  const [videoBitrate] = useState<number>(10_000_000);
  const [ratio] = useState<CameraRatio>("16:9");
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);

  // Barcode
  const [scanEnabled, setScanEnabled] = useState(false);

  // Shots and selection
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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "black",
        }}
      >
        <Text
          style={{
            color: "white",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Kamerayı kullanmak için izin gerekli
        </Text>
        <Button onPress={requestCamPerm} title="Kamera izni ver" />
      </View>
    );
  }

  // ------- helpers -------

  /**
   * Save a captured media file into the app's storage. When running on
   * web the camera API provides a base64 URI, which we can return
   * directly. On native platforms we copy the file into a `photos`
   * directory under the document directory (falling back to the cache
   * directory if the document directory does not exist) using the
   * new object-oriented file-system API. This avoids using the
   * now‑deprecated imperative methods of the legacy FileSystem API.
   */
 // cameraPro.tsx içinde
const saveToAppStorage = async (fromUri: string): Promise<string> => {
  if (Platform.OS === "web") return fromUri;

  let baseDir: Directory = Paths.document;
  if (!baseDir.exists) baseDir = Paths.cache;

  const photosDir = new Directory(baseDir, "photos");
  if (!photosDir.exists) photosDir.create({ intermediates: true });

  // URI'den güvenli şekilde kaynak dosyayı kur
  const srcFile = new File(Paths.dirname(fromUri), Paths.basename(fromUri));
  const destFile = new File(photosDir, `${Date.now()}.jpg`);
  srcFile.copy(destFile);

  return destFile.uri;
};


  const onCameraReady = () => {
    // If needed, you can query available picture sizes here with
    // CameraView.getAvailablePictureSizesAsync() and pick a specific size.
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
    if (recording) stopRecord();
    else await startRecord();
  };

  // ------- toggles -------
  const toggleMode = () =>
    setMode((p: CameraMode) => (p === "picture" ? "video" : "picture"));

  const toggleFacing = () =>
    setFacing((p: CameraType) => (p === "back" ? "front" : "back"));

  const cycleFlash = () =>
    setFlash((f: FlashMode) => (f === "off" ? "on" : f === "on" ? "auto" : "off"));

  const toggleTorch = () => setTorch((t: boolean) => !t);

  const toggleAF = () =>
    setAutofocus((a: FocusMode) => (a === "on" ? "off" : "on"));

  const bumpZoom = (d: number) =>
    setZoom((z: number) => Math.min(1, Math.max(0, +(z + d).toFixed(3))));

  // ------- selection -------
  const toggleSelect = (u: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(u)) n.delete(u);
      else n.add(u);
      return n;
    });
  };

 // cameraPro.tsx -> proceed()
const API = process.env.EXPO_PUBLIC_API_URL!;
const proceed = async () => {
  if (selectedCount === 0) return;
  for (const u of Array.from(selected)) {
    const form = new FormData();
    form.append("image", { uri: u, name: "capture.jpg", type: "image/jpeg" } as any);
    const res = await fetch(`${API}/api/v1/process-image`, { method: "POST", body: form });
    const json = await res.json();
    if (res.ok && json.processed_url) addQuestion(targetFolder, json.processed_url, "A");
  }
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
      ? {
          width: 80,
          height: 80,
          borderRadius: 9999,
          backgroundColor: "white",
        }
      : recording
      ? {
          width: 80,
          height: 80,
          borderRadius: 9999,
          backgroundColor: "#6b7280",
        }
      : {
          width: 80,
          height: 80,
          borderRadius: 9999,
          backgroundColor: "#dc2626",
        };

  const Controls = () => (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "flex-end",
      }}
    >
      {/* Bottom: shot strip */}
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
                      <Feather name="check-circle" size={18} />
                    ) : (
                      <Feather name="circle" size={18} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Bottom: main control panel */}
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
          {/* Left group */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingRight: 16,
            }}
          >
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

          {/* Middle shutter */}
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

          {/* Right group */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 16,
            }}
          >
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

  // Camera + overlay
  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* Top bar */}
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

      {/* Camera + overlay */}
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
            mirror={mirror}
            ratio={ratio}
            pictureSize={pictureSize}
            videoQuality={videoQuality}
            videoBitrate={videoBitrate}
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