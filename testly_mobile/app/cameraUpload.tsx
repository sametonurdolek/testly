import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useQuestions } from "../src/QuestionsContext";

export default function CameraUpload() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const router = useRouter();
  const { folder } = useLocalSearchParams<{ folder?: string }>();
  const { addQuestion } = useQuestions();

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-black mb-4">Kamera izni gerekiyor</Text>
        <TouchableOpacity className="bg-blue-500 px-4 py-2 rounded-lg" onPress={requestPermission}>
          <Text className="text-white">İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();

    const targetFolder = (folder && String(folder).trim()) || "Genel";
    addQuestion(targetFolder, photo.uri, "A");

    router.push({ pathname: "/(tabs)/questions", params: { folder: targetFolder } });
  };

  const toggleFacing = () => setFacing((p) => (p === "back" ? "front" : "back"));

  return (
    <View className="flex-1">
      <CameraView ref={cameraRef} className="flex-1" facing={facing} />
      <View className="absolute bottom-10 w-full flex-row justify-around">
        <TouchableOpacity className="bg-black/60 px-6 py-3 rounded-lg" onPress={toggleFacing}>
          <Text className="text-white">Çevir</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-full" onPress={takePicture}>
          <Text className="text-white font-bold">Çek</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
