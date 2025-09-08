import React, { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Image, Modal, TextInput } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFolders } from "../../src/FoldersContext";

export default function HomeScreen() {
  const router = useRouter();
  const { folders, addFolder, selectedFolder, setSelectedFolder } = useFolders();

  const [open, setOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isModalVisible && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isModalVisible]);

  const items = folders.map((f) => ({ label: f, value: f }));

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Header: ➕ Klasör Yarat */}
      <View className="items-end px-4 pt-2 pb-2">
        <TouchableOpacity
          className="rounded-lg bg-green-500 px-4 py-4"
          onPress={() => setIsModalVisible(true)}
        >
          <Text className="font-bold text-white">+ Klasör</Text>
        </TouchableOpacity>
      </View>

      {/* 📁 Klasörler */}
      <FlatList
        data={folders}
        keyExtractor={(item) => item}
        numColumns={3}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="m-2 h-32 w-32 items-center justify-center rounded-xl bg-gray-200"
            onPress={() => {
              setSelectedFolder(item);
              router.push({ pathname: "/questions", params: { folder: item } });
            }}
          >
            <Text className="text-base font-medium">{item}</Text>
          </TouchableOpacity>
        )}
        className="flex-1"
        contentContainerStyle={{ padding: 8 }}
      />

      {/* 📷 Fotoğraf Yükle + Dropdown */}
      <View className="items-center pb-20">
        <TouchableOpacity
          className="m-2 h-20 w-1/2 items-center justify-center rounded-full bg-blue-500"
          onPress={() => router.push("/uploadMenu")}
        >
          <Text className="font-bold text-white">Fotoğraf Yükle</Text>
        </TouchableOpacity>

        <View className="mt-2 w-1/2 rounded-md border border-black">
          <DropDownPicker
            open={open}
            value={selectedFolder}
            items={items}
            setOpen={setOpen}
            setValue={(cb) => {
              const v = typeof cb === "function" ? cb(selectedFolder) : cb;
              setSelectedFolder(v as string | null);
            }}
            setItems={() => {}}
            placeholder="Klasör seç"
            style={{ borderWidth: 0, justifyContent: "center" }}
            textStyle={{ textAlign: "center" }}
            dropDownContainerStyle={{ borderWidth: 0 }}
          />
        </View>
      </View>

      {/* 🖼️ Seçilen Fotoğraf Göster (opsiyonel) */}
      {image && <Image source={{ uri: image }} className="mt-4 h-40 w-40 self-center rounded-lg" />}

      {/* 🔹 Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="w-80 rounded-xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold">Yeni Klasör Adı</Text>
            <TextInput
              ref={inputRef}
              className="mb-4 rounded-lg border border-gray-300 p-2"
              placeholder="Klasör adı girin"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <View className="flex-row justify-between">
              <TouchableOpacity
                className="rounded-lg bg-gray-400 px-4 py-2"
                onPress={() => setIsModalVisible(false)}
              >
                <Text className="text-white">İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-lg bg-green-500 px-4 py-2"
                onPress={() => {
                  if (newFolderName.trim()) {
                    addFolder(newFolderName);
                    setNewFolderName("");
                    setIsModalVisible(false);
                  }
                }}
              >
                <Text className="text-white">Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
