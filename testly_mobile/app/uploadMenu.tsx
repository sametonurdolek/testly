// path: app/uploadMenu.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import DropDownPicker from "react-native-dropdown-picker";
import { useFolders } from "../src/FoldersContext";

export default function UploadMenu() {
  const router = useRouter();
  const { folders, selectedFolder, setSelectedFolder } = useFolders();

  const [open, setOpen] = useState(false);
  const items = folders.map(f => ({ label: f, value: f }));

  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="mb-6 text-lg font-bold">Fotoğraf Yükleme Menüsü</Text>

      <View className="mb-6 w-3/4">
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
          style={{ borderWidth: 1, borderColor: "#000" }}
          textStyle={{ textAlign: "center" }}
          dropDownContainerStyle={{ borderWidth: 1, borderColor: "#000" }}
        />
      </View>

      <TouchableOpacity
        className="mb-4 w-3/4 items-center rounded-lg bg-blue-500 px-6 py-3"
        onPress={() => router.push({ pathname: "/cameraPro", params: { folder: selectedFolder } })}
        disabled={!selectedFolder}
      >
        <Text className="text-white">📷 Kamerayla Yükle</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="w-3/4 items-center rounded-lg bg-green-500 px-6 py-3"
        onPress={() => router.push({ pathname: "/galleryUpload", params: { folder: selectedFolder } })}
        disabled={!selectedFolder}
      >
        <Text className="text-white">🖼️ Galeriden Seç</Text>
      </TouchableOpacity>
    </View>
  );
}
