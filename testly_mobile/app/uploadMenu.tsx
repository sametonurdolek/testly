import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useFolders } from "../src/FoldersContext";

export default function UploadMenu() {
  const router = useRouter();
  const { folders, selectedFolder, setSelectedFolder } = useFolders();

  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="mb-6 text-lg font-bold">Fotoğraf Yükleme Menüsü</Text>

      {/* Seçili klasör göstergesi */}
      <View className="mb-6 w-3/4 items-center">
        {selectedFolder ? (
          <Text className="mb-2 text-base">
            Seçili klasör:{" "}
            <Text className="font-bold text-blue-600">{selectedFolder}</Text>
          </Text>
        ) : (
          <Text className="mb-2 text-gray-500">Henüz klasör seçilmedi</Text>
        )}

        <TouchableOpacity
          className="rounded-lg bg-gray-200 px-4 py-2"
          onPress={() => setIsModalVisible(true)}
        >
          <Text className="text-black">Klasör Değiştir</Text>
        </TouchableOpacity>
      </View>

      {/* Kamera yükle */}
      <TouchableOpacity
        className="mb-4 w-3/4 items-center rounded-lg bg-blue-500 px-6 py-3"
        onPress={() =>
          router.push({ pathname: "/cameraPro", params: { folder: selectedFolder } })
        }
        disabled={!selectedFolder}
      >
        <Text className="text-white">📷 Kamerayla Yükle</Text>
      </TouchableOpacity>

      {/* Galeriden seç */}
      <TouchableOpacity
        className="w-3/4 items-center rounded-lg bg-green-500 px-6 py-3"
        onPress={() =>
          router.push({ pathname: "/galleryUpload", params: { folder: selectedFolder } })
        }
        disabled={!selectedFolder}
      >
        <Text className="text-white">🖼️ Galeriden Seç</Text>
      </TouchableOpacity>

      {/* Klasör seçme modalı */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="w-80 rounded-xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold">Klasör Seç</Text>
            <FlatList<string>
              data={folders}
              keyExtractor={(item) => item}
              numColumns={2}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`m-2 h-20 flex-1 items-center justify-center rounded-lg ${
                    selectedFolder === item ? "bg-blue-300" : "bg-gray-200"
                  }`}
                  onPress={() => {
                    setSelectedFolder(item);
                    setIsModalVisible(false);
                  }}
                >
                  <Text className="text-base font-medium">{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              className="mt-4 rounded-lg bg-red-500 px-4 py-2"
              onPress={() => setIsModalVisible(false)}
            >
              <Text className="text-white">Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
