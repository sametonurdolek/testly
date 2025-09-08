import React, { createContext, useContext, useState, ReactNode } from "react";

type Question = { uri: string; answer: string };

export type QuestionsContextType = {
  questions: { [folder: string]: Question[] };
  addQuestion: (folder: string, uri: string, answer: string) => void;
};

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

export const QuestionsProvider = ({ children }: { children: ReactNode }) => {
  const [questions, setQuestions] = useState<{ [folder: string]: Question[] }>({});

  const addQuestion = (folder: string, uri: string, answer: string) => {
    setQuestions((prev) => ({
      ...prev,
      [folder]: [...(prev[folder] || []), { uri, answer }],
    }));
  };

  return (
    <QuestionsContext.Provider value={{ questions, addQuestion }}>
      {children}
    </QuestionsContext.Provider>
  );
};

export const useQuestions = (): QuestionsContextType => {
  const context = useContext(QuestionsContext);
  if (!context) throw new Error("useQuestions must be used within a QuestionsProvider");
  return context;
};
