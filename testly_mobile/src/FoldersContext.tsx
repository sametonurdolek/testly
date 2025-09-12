import React, { createContext, useContext, useState, ReactNode } from "react";

type FoldersContextType = {
  folders: string[];
  addFolder: (name: string) => void;
  selectedFolder: string | null;
  setSelectedFolder: (name: string | null) => void;
};

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export const FoldersProvider = ({ children }: { children: ReactNode }) => {
  const [folders, setFolders] = useState<string[]>(["Matematik", "Fizik", "Kimya"]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(
    folders.length > 0 ? folders[0] : null
  );

  const addFolder = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setFolders((prev) => (prev.includes(n) ? prev : [...prev, n]));
    setSelectedFolder(n);
  };

  return (
    <FoldersContext.Provider
      value={{ folders, addFolder, selectedFolder, setSelectedFolder }}
    >
      {children}
    </FoldersContext.Provider>
  );
};

export const useFolders = () => {
  const ctx = useContext(FoldersContext);
  if (!ctx) throw new Error("useFolders must be used within FoldersProvider");
  return ctx;
};
