import { createContext, useContext, useState } from "react";

const LessonContext = createContext(null);

export function LessonProvider({ children }) {
  const [lesson, setLesson] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  function reset() {
    setLesson(null);
    setJobId(null);
    setStatus("idle");
    setError(null);
  }

  return (
    <LessonContext.Provider value={{
      lesson, setLesson,
      jobId, setJobId,
      status, setStatus,
      error, setError,
      reset
    }}>
      {children}
    </LessonContext.Provider>
  );
}

export function useLesson() {
  return useContext(LessonContext);
}