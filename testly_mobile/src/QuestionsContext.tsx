// path: src/QuestionsContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

export type Answer = "A" | "B" | "C" | "D" | "E";

export type Question = {
  id: string;
  uri: string;
  status: "pending" | "ready";
  answer?: Answer;
};

type QuestionsByFolder = { [folder: string]: Question[] };

export type QuestionsContextType = {
  questions: QuestionsByFolder;

  // Overload: hazır nesne ile ekle
  addQuestion(folder: string, q: Question): void;
  // Overload: eski kullanım ile ekle (uri, answer) -> ready olarak eklenir
  addQuestion(folder: string, uri: string, answer: Answer): void;

  // Belirli alanları güncelle
  updateQuestion(folder: string, id: string, patch: Partial<Question>): void;

  // Sık kullanım için kısayol
  updateQuestionUri(
    folder: string,
    id: string,
    newUri: string,
    status?: Question["status"]
  ): void;
};

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

export const QuestionsProvider = ({ children }: { children: ReactNode }) => {
  const [questions, setQuestions] = useState<QuestionsByFolder>({});

  // Tek implementasyon, overload’ları karşılar
  const addQuestion = (folder: string, arg2: any, arg3?: any) => {
    setQuestions((prev) => {
      const list = prev[folder] || [];
      let toAdd: Question;

      if (typeof arg2 === "string") {
        // addQuestion(folder, uri, answer)
        const uri = arg2 as string;
        const answer = arg3 as Answer | undefined;
        toAdd = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          uri,
          status: "ready",
          ...(answer ? { answer } : {}),
        };
      } else {
        // addQuestion(folder, q)
        const q = arg2 as Question;
        toAdd = {
          id: q.id,
          uri: q.uri,
          status: q.status ?? "pending",
          ...(q.answer ? { answer: q.answer } : {}),
        };
      }

      return { ...prev, [folder]: [...list, toAdd] };
    });
  };

  const updateQuestion = (folder: string, id: string, patch: Partial<Question>) => {
    setQuestions((prev) => {
      const list = prev[folder] || [];
      const idx = list.findIndex((q) => q.id === id);
      if (idx < 0) return prev;
      const next = [...list];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, [folder]: next };
    });
  };

  const updateQuestionUri = (
    folder: string,
    id: string,
    newUri: string,
    status: Question["status"] = "ready"
  ) => {
    updateQuestion(folder, id, { uri: newUri, status });
  };

  return (
    <QuestionsContext.Provider
      value={{ questions, addQuestion: addQuestion as QuestionsContextType["addQuestion"], updateQuestion, updateQuestionUri }}
    >
      {children}
    </QuestionsContext.Provider>
  );
};

export const useQuestions = (): QuestionsContextType => {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error("useQuestions must be used within a QuestionsProvider");
  return ctx;
};
