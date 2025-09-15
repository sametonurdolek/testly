// path: app/(tabs)/questions.tsx
import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { useFolders } from "../../src/FoldersContext";
import { useQuestions } from "../../src/QuestionsContext";

type Answer = "A" | "B" | "C" | "D" | "E";
type QItem = { id?: string; uri: string; status?: "pending" | "ready"; answer?: Answer };

export default function QuestionsScreen() {
  const router = useRouter();
  const { setSelectedFolder } = useFolders();
  const { questions, updateQuestion } = useQuestions(); // <-- context’e yazacağız
  const { folder } = useLocalSearchParams<{ folder?: string | string[] }>();

  const folderName = Array.isArray(folder) ? folder[0] : folder || "Genel";
  const folderQuestions: QItem[] = (questions[folderName] || []) as QItem[];

  // Cevaplar: öğe anahtarı (id || uri) -> cevap
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  // Var olan cevapları ekrana girişte yükle
  useEffect(() => {
    const seed: Record<string, Answer> = {};
    folderQuestions.forEach((q, i) => {
      const key = q.id ?? q.uri ?? String(i);
      if (q?.answer && ["A", "B", "C", "D", "E"].includes(q.answer)) {
        seed[key] = q.answer as Answer;
      }
    });
    setAnswers(seed);
  }, [folderName, folderQuestions.length]);

  // Hem local state’i hem de context’i güncelle
  const selectAnswer = (id: string | undefined, uri: string, choice: Answer) => {
    const key = id ?? uri;
    setAnswers((prev) => ({ ...prev, [key]: choice }));

    if (id) {
      updateQuestion(folderName, id, { answer: choice });
    } else {
      // id yoksa uri ile bul ve güncelle
      const found = (questions[folderName] || []).find((q: any) => q.uri === uri);
      if (found?.id) updateQuestion(folderName, found.id, { answer: choice });
    }
  };

  const renderItem = ({ item, index }: { item: QItem; index: number }) => {
    const key = item.id ?? item.uri ?? `${folderName}-${index}`;
    const chosen = answers[key];

    return (
      <View className="w-1/2 p-2">
        <View className="rounded-lg bg-white">
          <View className="relative">
            <Image source={{ uri: item.uri }} className="aspect-square w-full rounded-lg" />
            {item.status === "pending" && (
              <View className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1">
                <Text className="text-[10px] font-semibold text-white">işleniyor…</Text>
              </View>
            )}
          </View>

          {/* Şık seçme alanı */}
          <View className="mt-3 px-1">
            {/* Üst sıra: A B C */}
            <View className="mb-2 flex-row items-center justify-center">
              {(["A", "B", "C"] as Answer[]).map((c) => {
                const active = chosen === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => selectAnswer(item.id, item.uri, c)}
                    className={`mx-2 h-10 w-10 items-center justify-center rounded-md border ${
                      active ? "border-blue-600 bg-blue-100" : "border-black bg-gray-200"
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Soru ${index + 1} şık ${c}`}
                  >
                    <Text className="text-lg font-bold">{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Alt sıra: D E — aradaki boşluk azaltılmış */}
            <View className="flex-row items-center justify-center">
              {(["D", "E"] as Answer[]).map((c, i2) => {
                const active = chosen === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => selectAnswer(item.id, item.uri, c)}
                    className={`${i2 === 0 ? "mr-[11.2px]" : "ml-[11.2px]"} h-10 w-10 items-center justify-center rounded-md border ${
                      active ? "border-blue-600 bg-blue-100" : "border-black bg-gray-200"
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Soru ${index + 1} şık ${c}`}
                  >
                    <Text className="text-lg font-bold">{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Frontend'den PDF oluşturma örneği
  const generatePDF = async (images: File[], answers: string[]) => {
    try {
      // Önce görselleri upload et
      const formData = new FormData();
      images.forEach(img => formData.append('images', img));
      
      const uploadResponse = await fetch('http://localhost:5000/api/pdf/upload-images', {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      
      // Sonra PDF oluştur
      const pdfResponse = await fetch('http://localhost:5000/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadData.uploaded_files,
          answers: answers,
          user_id: 'user123'
        })
      });
      
      const pdfData = await pdfResponse.json();
      console.log('PDF oluşturuldu:', pdfData.download_url);
      
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
    }
  };

  return (
    <View className="flex-1 bg-white px-4 pt-12">
      {/* Header */}
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

        <View className="h-9 w-9" />
      </View>

      <View className="items-center">
        <View className="aspect-[2/3] w-11/12 overflow-hidden rounded-md border-2 border-black">
          <FlatList
            data={folderQuestions}
            keyExtractor={(item, idx) => item.id ?? item.uri ?? `${folderName}-${idx}`}
            numColumns={2}
            renderItem={renderItem}
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
