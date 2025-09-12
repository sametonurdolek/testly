// path: app/_layout.tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { QuestionsProvider } from "../src/QuestionsContext";
import { FoldersProvider } from "../src/FoldersContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./globals.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
    <FoldersProvider>
      <QuestionsProvider>
        <GestureHandlerRootView className="flex-1">
          <Drawer initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
            <Drawer.Screen name="(tabs)" options={{ drawerLabel: "Ana Sayfa" }} />
            <Drawer.Screen name="uploadMenu" options={{ drawerLabel: "Yükleme Menüsü" }} />
            <Drawer.Screen name="galleryUpload" options={{ drawerLabel: "Galeriden Seç" }} />
            <Drawer.Screen name="cameraUpload" options={{ drawerLabel: "Basit Kamera" }} />
            <Drawer.Screen
              name="cameraPro"
              options={{ headerShown: false, drawerItemStyle: { display: "none" } }}
            />
          </Drawer>
        </GestureHandlerRootView>
      </QuestionsProvider>
    </FoldersProvider>
    </SafeAreaProvider>
  );
}
