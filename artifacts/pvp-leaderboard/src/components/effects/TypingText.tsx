import { useEffect, useState } from "react";

interface TypingTextProps {
  texts: string[];
  className?: string;
  typingSpeed?: number;
  pauseDuration?: number;
}

export function TypingText({ texts, className, typingSpeed = 70, pauseDuration = 2000 }: TypingTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      const t = setTimeout(() => {
        setPaused(false);
        setDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(t);
    }

    const current = texts[textIdx];

    if (!deleting) {
      if (charIdx < current.length) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx + 1));
          setCharIdx(c => c + 1);
        }, typingSpeed);
        return () => clearTimeout(t);
      } else {
        setPaused(true);
      }
    } else {
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx - 1));
          setCharIdx(c => c - 1);
        }, typingSpeed / 2);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setTextIdx(i => (i + 1) % texts.length);
      }
    }
  }, [charIdx, deleting, paused, textIdx, texts, typingSpeed, pauseDuration]);

  return (
    <span className={className}>
      {displayed}
      <span className="animate-blink-cursor inline-block w-[3px] h-[0.9em] bg-current align-middle ml-1 opacity-90" />
    </span>
  );
}
