import React, { useState, useEffect } from 'react';
import { useSpeechSynthesis } from 'react-speech-kit';
import { motion } from 'framer-motion';

const VoiceAssistant = ({ onClose }) => {
  const [message, setMessage] = useState('');
  const { speak, cancel } = useSpeechSynthesis();
  
  useEffect(() => {
    const englishMsg = "Please login or register to access EV charging services";
    const hindiMsg = "कृपया इलेक्ट्रिक वाहन चार्जिंग सेवाओं का उपयोग करने के लिए लॉगिन या पंजीकरण करें";
    
    setMessage(englishMsg);
    speak({ text: englishMsg });
    
    const timer = setTimeout(() => {
      cancel();
      setMessage(hindiMsg);
      speak({ text: hindiMsg });
    }, 3000);
    
    return () => cancel();
  }, []);

  return (
    <motion.div
      className="voice-assistant"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="assistant-message">{message}</div>
      <button onClick={onClose} className="close-btn">×</button>
      <div className="assistant-animation">
        <div className="pulse-ring"></div>
        <div className="assistant-icon">⚡</div>
      </div>
    </motion.div>
  );
};

export default VoiceAssistant;