
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface WebConverterProps {
  format: 'excel' | 'word';
  setFormat: (f: 'excel' | 'word') => void;
}

const WebConverter: React.FC<WebConverterProps> = ({ format, setFormat }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setDownloadUrl(null);
      setError(null);
      setStatusMessage("");
    }
  };

  const convertFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    setStatusMessage("Analyzing data tracks...");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const prompt = format === 'excel' 
            ? "Extract all data from this PDF into a spreadsheet format. Organize tables into sheets."
            : "Convert this PDF into a structured Word document.";

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                { text: prompt }
              ]
            }]
          });

          setDownloadUrl("#"); // Mocking for aesthetic display
          setLoading(false);
          setStatusMessage("");
        } catch (innerErr) {
          setError("Engine failure. Please recalibrate file.");
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("System override failed.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl border border-slate-800 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">Infotainment Console</h2>
          <p className="text-sm text-slate-500">Select your target output format.</p>
        </div>
        
        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button 
            onClick={() => setFormat('excel')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${format === 'excel' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            EXCEL
          </button>
          <button 
            onClick={() => setFormat('word')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${format === 'word' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            WORD
          </button>
        </div>
      </div>

      <div 
        className={`relative border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all ${file ? 'border-orange-500 bg-orange-500/5' : 'border-slate-800 hover:border-orange-500 bg-slate-950/50'}`}
      >
        <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${file ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-lg font-semibold mb-1 text-white">{file ? file.name : 'Ignition: Upload PDF'}</p>
        {file && !loading && (
          <button onClick={convertFile} className="mt-6 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-orange-500/20">
            START EXTRACTION
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center py-12">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-orange-500 animate-pulse">{statusMessage}</p>
        </div>
      )}
    </div>
  );
};

export default WebConverter;
