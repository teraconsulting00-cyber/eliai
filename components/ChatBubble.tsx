
import React from 'react';
import { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
        isUser 
          ? 'bg-blue-600 text-white rounded-tr-none' 
          : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
      }`}>
        <div className="flex items-center mb-2">
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">
            {isUser ? 'You' : 'Gemini'}
          </span>
          <span className="ml-2 text-[10px] opacity-50">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.attachments.map((att, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden bg-slate-100 border border-slate-200 p-1">
                {att.mimeType.startsWith('image/') ? (
                  <img 
                    src={att.data} 
                    alt={att.name} 
                    className="max-h-48 w-auto object-contain rounded"
                  />
                ) : (
                  <div className="flex items-center p-3 space-x-2 bg-white rounded shadow-sm">
                    <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{att.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{att.mimeType.split('/')[1]}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
