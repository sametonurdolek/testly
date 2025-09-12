import * as NavigationBar from "expo-navigation-bar";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Image, ImageBackground, Text, View } from "react-native";
import { QuestionsProvider } from "../../src/QuestionsContext";
import { FoldersProvider } from "../../src/FoldersContext";


const TabIcon = ({ focused, icon, title }: any) => {
  if (focused) {
    return (
      <ImageBackground
        source={{ uri: "https://via.placeholder.com/150" }}
        className="flex-row w-full min-w-[112px] min-h-16 mt-4 justify-center items-center rounded-full overflow-hidden"
      >
        <Image source={icon} className="w-5 h-5" style={{ tintColor: "#151312" }} />
        <Text className="text-gray-400 text-base font-semibold ml-2">{title}</Text>
      </ImageBackground>
    );
  }
  return (
    <View className="justify-center items-center mt-4 rounded-lg">
      <Image source={icon} className="w-5 h-5 mt-4" style={{ tintColor: "#fff" }} />
    </View>
  );
};

const _layout = () => {
  useEffect(() => {
    // Android sistem navigation barını gizle
    NavigationBar.setVisibilityAsync("hidden");
    // Kenardan kaydırarak geri gelmeyi aktif et
    
  }, []);

  return (
    
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarStyle: {
  backgroundColor: "#0f0D23",
  height: 52,
  borderTopWidth: 0,        // üst çizgiyi de kaldırdım
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,                // tam alta yasla
  borderWidth: 0,           // ekstra border olmasın
},

      }}
    >
      {/* 📂 Klasörler */}
      <Tabs.Screen
  name="index"
  options={{
    title: "Klasörler",
    headerShown: false,
    tabBarIcon: ({ focused }) => (
      <TabIcon
        focused={focused}
        icon={{ uri: "https://img.icons8.com/fluency-systems-filled/48/FFD700/folder-invoices.png" }}
        title="Klasörler"
      />
    ),
  }}
/>


      {/* ❓ Sorular */}
      <Tabs.Screen
        name="questions"
        options={{
          title: "Questions",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={{ uri: "https://img.icons8.com/ios-filled/50/ffffff/help.png" }}
              title="Questions"
            />
          ),
        }}
      />

      {/* 📄 PDFs */}
      <Tabs.Screen
        name="pdfs"
        options={{
          title: "PDFs",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={{ uri: "https://img.icons8.com/ios-filled/50/ffffff/pdf.png" }}
              title="PDFs"
            />
          ),
        }}
      />

      {/* 👤 Profil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={{ uri: "https://img.icons8.com/ios-filled/50/ffffff/user.png" }}
              title="Profile"
            />
          ),
        }}
      />
    </Tabs>
    
  );
};

export default _layout;
