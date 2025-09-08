// path: app/(tabs)/questions.tsx
import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { useFolders } from "../../src/FoldersContext";
import { useQuestions } from "../../src/QuestionsContext";

export default function QuestionsScreen() {
  const router = useRouter();
  const { setSelectedFolder } = useFolders();
  const { questions } = useQuestions();
  const { folder } = useLocalSearchParams<{ folder?: string | string[] }>();

  const folderName = Array.isArray(folder) ? folder[0] : folder || "Genel";
  const folderQuestions = questions[folderName] || [];

  return (
    <View className="flex-1 bg-white px-4 pt-12">
      {/* Header: geri + ortalı başlık */}
      <View className="mb-3 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.replace("/")}
          className="h-9 w-9 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Geri"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="flex-1 text-center text-lg font-bold">
          {folderName} Klasörü Soruları
        </Text>

        {/* Başlığı ortalamak için sağ spacer */}
        <View className="h-9 w-9" />
      </View>

      <View className="items-center">
        <View className="aspect-[2/3] w-11/12 overflow-hidden rounded-md border-2 border-black">
          <FlatList
            data={folderQuestions}
            keyExtractor={(_, index) => `${folderName}-${index}`}
            numColumns={2}
            renderItem={({ item }) => (
              <View className="w-1/2 p-2">
                <View className="rounded-lg bg-white">
                  <Image source={{ uri: item.uri }} className="aspect-square w-full rounded-lg" />
                  <View className="mt-2 h-10 w-10 items-center justify-center self-center rounded-md border border-black bg-gray-200">
                    <Text className="text-lg font-bold">{item.answer}</Text>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center p-4">
                <Text className="text-gray-500">Bu klasörde henüz soru yok.</Text>
              </View>
            }
            className="flex-1"
            contentContainerStyle={{ padding: 8 }}
          />
        </View>
      </View>

      <View className="mt-6 items-center">
        <TouchableOpacity
          className="h-16 w-3/4 items-center justify-center rounded-md border-2 border-blue-600"
          onPress={() => {
            setSelectedFolder(folderName);
            router.push("/uploadMenu");
          }}
        >
          <Text className="font-semibold text-blue-600">Fotoğraf Yükle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
