import React, { useState } from 'react';
import { Sparkles, CornerDownLeft } from 'lucide-react';

interface AskAIBarProps {
  onAsk: (prompt: string) => Promise<void>;
  isProcessing: boolean;
}

export const AskAIBar: React.FC<AskAIBarProps> = ({ onAsk, isProcessing }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    const p = prompt.trim();
    setPrompt('');
    await onAsk(p);
  };

  return (
    <div className="scribe-ask-ai-box">
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <Sparkles size={13} color="var(--scribe-accent)" style={{ position: 'absolute', left: '9px', pointerEvents: 'none' }} />
        <input
          type="text"
          className="scribe-input"
          style={{ paddingLeft: '28px', paddingRight: '30px' }}
          placeholder="Ask AI: 'Summarize slide on screen'..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isProcessing}
          style={{
            position: 'absolute',
            right: '4px',
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            background: prompt.trim() ? 'var(--scribe-primary)' : 'transparent',
            border: 'none',
            color: prompt.trim() ? 'var(--scribe-primary-fg)' : 'var(--scribe-subtle)',
            cursor: prompt.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Send instruction to AI"
        >
          <CornerDownLeft size={12} />
        </button>
      </form>
    </div>
  );
};
