// app/galleryUpload.tsx
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useQuestions } from "../src/QuestionsContext";

export default function GalleryUpload() {
  const router = useRouter();
  const { folder } = useLocalSearchParams<{ folder?: string }>();
  const { addQuestion } = useQuestions();

  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const targetFolder = (folder && String(folder).trim()) || "Genel";

  const ensurePermissionAndPick = async () => {
    try {
      setBusy(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin gerekli", "Galeriye erişim izni vermelisin.");
        router.back();
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 0, // sınırsız
        quality: 1,
      });

      if (result.canceled) {
        // Kullanıcı seçim yapmadıysa geri dön
        router.back();
        return;
      }

      // Context’e ekle
      result.assets.forEach(a => addQuestion(targetFolder, a.uri, "A"));

      // Önizleme için tümünü göster
      setImages(result.assets.map(a => a.uri));
    } finally {
      setBusy(false);
    }
  };

  // Ekran açılır açılmaz galeriye git
  useEffect(() => {
    ensurePermissionAndPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-lg font-bold text-center mb-4">{targetFolder} — Galeriden Yükle</Text>

      {busy ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          {/* Aksiyonlar */}
          <View className="flex-row gap-3 justify-center mb-4">
            <TouchableOpacity
              className="bg-green-600 px-4 py-3 rounded-lg"
              onPress={ensurePermissionAndPick}
            >
              <Text className="text-white font-semibold">🖼️ Tekrar Seç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-blue-600 px-4 py-3 rounded-lg"
              onPress={() => router.replace({ pathname: "/(tabs)/questions", params: { folder: targetFolder } })}
              disabled={images.length === 0}
            >
              <Text className="text-white font-semibold">➡️ Sorulara Git</Text>
            </TouchableOpacity>
          </View>

          {/* Önizleme ızgarası */}
          {images.length > 0 ? (
            <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
              {images.map((u, i) => (
                <Image
                  key={`${u}-${i}`}
                  source={{ uri: u }}
                  className="w-24 h-24 m-1 rounded-lg"
                />
              ))}
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Henüz görsel seçilmedi.</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
