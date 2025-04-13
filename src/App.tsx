import React, { useState, useEffect, useRef, JSX } from 'react';
import { Camera, Video, X, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterOption {
  name: string;
  class: string;
}

export default function App(): JSX.Element {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [currentFilter, setCurrentFilter] = useState<string>('none');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const filterOptions: FilterOption[] = [
    { name: 'None', class: '' },
    { name: 'Grayscale', class: 'grayscale' },
    { name: 'Sepia', class: 'sepia' },
    { name: 'Invert', class: 'invert' },
    { name: 'Hue Rotate', class: 'hue-rotate-180' },
    { name: 'Brightness', class: 'brightness-125' }
  ];

  // Camera activation
  const toggleCamera = async (): Promise<void> => {
    if (cameraActive) {
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
      if (recording) {
        stopRecording();
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: audioEnabled 
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays when loaded
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch(e => console.error("Error playing video:", e));
            }
          };
        }
        
        setCameraActive(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please check permissions.");
      }
    }
  };

  // Start recording
  const startRecording = (): void => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      
      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${new Date().toISOString()}.mp4`;
        a.click();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not start recording. Please try again.");
    }
  };

  // Stop recording
  const stopRecording = (): void => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Toggle audio
  const toggleAudio = async (): Promise<void> => {
    const newAudioState = !audioEnabled;
    setAudioEnabled(newAudioState);
    
    if (cameraActive && streamRef.current) {
      // Restart stream with new audio setting
      streamRef.current.getTracks().forEach(track => track.stop());
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: newAudioState
        });
        streamRef.current = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error("Error toggling audio:", err);
      }
    }
  };

  // Apply filters
  const applyFilter = (filter: string): void => {
    setCurrentFilter(filter);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [recording]);

  // Get the current filter class
  const getCurrentFilterClass = (): string => {
    const filter = filterOptions.find(f => f.name.toLowerCase() === currentFilter.toLowerCase());
    return filter ? filter.class : '';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 text-white">
      <header className="p-6">
        <motion.h1 
          className="text-4xl font-bold text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Camera Web App
        </motion.h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {cameraActive ? (
            <motion.div 
              key="camera-active"
              className="relative rounded-xl overflow-hidden shadow-2xl bg-black w-full max-w-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                muted={!audioEnabled}
                className={`w-full h-full object-cover min-h-64 ${getCurrentFilterClass()}`}
              />
              
              <div className="absolute top-4 right-4 flex gap-2">
                <motion.button 
                  className="p-2 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleCamera}
                >
                  <X size={20} />
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="camera-inactive"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="w-64 h-64 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleCamera}
              >
                <Camera size={64} />
              </motion.div>
              <motion.p 
                className="text-xl font-medium text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Click to start camera
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {cameraActive && (
          <motion.div 
            className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.button 
              className={`px-4 py-3 rounded-full flex items-center justify-center gap-2 ${
                recording ? 'bg-red-600 text-white' : 'bg-white text-purple-900'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={recording ? stopRecording : startRecording}
            >
              <Video size={20} />
              <span>{recording ? 'Stop Recording' : 'Start Recording'}</span>
            </motion.button>

            <motion.button 
              className="px-4 py-3 rounded-full bg-white text-purple-900 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleAudio}
            >
              {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              <span>{audioEnabled ? 'Mute Audio' : 'Unmute Audio'}</span>
            </motion.button>

            <motion.div className="relative">
              <motion.button 
                className="w-full px-4 py-3 rounded-full bg-white text-purple-900 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const dropdown = document.getElementById('filter-dropdown');
                  if (dropdown) {
                    dropdown.classList.toggle('hidden');
                  }
                }}
              >
                <span>Filters: {currentFilter}</span>
              </motion.button>
              
              <div id="filter-dropdown" className="absolute top-full mt-2 w-full bg-white text-purple-900 rounded-lg shadow-lg hidden z-10">
                {filterOptions.map((filter, index) => (
                  <div 
                    key={index}
                    className="px-4 py-2 hover:bg-purple-100 cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                    onClick={() => {
                      applyFilter(filter.name.toLowerCase());
                      const dropdown = document.getElementById('filter-dropdown');
                      if (dropdown) dropdown.classList.add('hidden');
                    }}
                  >
                    {filter.name}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>

      <footer className="p-6 text-center text-sm opacity-80">
        <p>Created with React, TypeScript, Tailwind CSS and Framer Motion</p>
      </footer>
    </div>
  );
}