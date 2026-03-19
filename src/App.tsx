/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  Loader2,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import * as XLSX from 'xlsx';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface AuditResult {
  summary: string;
  currency: string;
  totalVolume: number;
  baseCurrencyVolume: number;
  anomalies: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  detectedDateRange: string;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (selectedFile: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const model = "gemini-3-flash-preview";
      const prompt = `
        You are a Multimodal Universal Financial Auditor. 
        Analyze the provided financial document (image, PDF, or text).
        
        1. Data Identification: Detect currency (BHD, QAR, USD, etc.) and date formats.
        2. Contextual Scaling: Convert all totals to BHD (Bahraini Dinar) using 2026 approximate rates (1 BHD = 2.65 USD, 1 BHD = 9.65 QAR).
        3. Anomaly Detection: Identify AML "Red Flags" (Structuring, rapid movement, source-of-wealth mismatches).
        4. Summary: Provide a clear "Summary of Financial Health and Risk".

        Return the response in JSON format with the following structure:
        {
          "summary": "markdown formatted summary",
          "currency": "detected currency",
          "totalVolume": number,
          "baseCurrencyVolume": number (in BHD),
          "anomalies": ["list of red flags"],
          "riskLevel": "Low" | "Medium" | "High",
          "detectedDateRange": "string"
        }
      `;

      let parts: any[] = [{ text: prompt }];

      if (
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.name.endsWith('.xlsx') ||
        selectedFile.name.endsWith('.xls')
      ) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let textContent = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          textContent += `Sheet: ${sheetName}\n`;
          textContent += XLSX.utils.sheet_to_csv(sheet);
          textContent += '\n\n';
        });
        
        // Truncate to avoid token limit (approx 1M tokens = ~4M chars, let's limit to 2M chars)
        const MAX_CHARS = 2000000;
        if (textContent.length > MAX_CHARS) {
          textContent = textContent.substring(0, MAX_CHARS) + '\n\n... [CONTENT TRUNCATED DUE TO SIZE LIMIT]';
        }
        
        parts.push({ text: `Here is the content of the Excel file:\n${textContent}` });
      } else if (
        selectedFile.type === 'text/csv' || 
        selectedFile.name.endsWith('.csv')
      ) {
        let textContent = await selectedFile.text();
        
        // Truncate to avoid token limit
        const MAX_CHARS = 2000000;
        if (textContent.length > MAX_CHARS) {
          textContent = textContent.substring(0, MAX_CHARS) + '\n\n... [CONTENT TRUNCATED DUE TO SIZE LIMIT]';
        }
        
        parts.push({ text: `Here is the content of the CSV file:\n${textContent}` });
      } else {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
        });
        reader.readAsDataURL(selectedFile);
        const base64Data = await base64Promise;
        parts.push({
          inlineData: {
            mimeType: selectedFile.type || "application/octet-stream",
            data: base64Data,
          },
        });
      }

      const response = await genAI.models.generateContent({
        model,
        contents: [
          {
            parts,
          },
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsedResult = JSON.parse(response.text || '{}');
      setResult(parsedResult);
    } catch (err) {
      console.error(err);
      setError("Failed to process the document. Please ensure it's a valid financial file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      processFile(selectedFile);
    }
  }, []);

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">FinAudit AI</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              AML Compliant Engine
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Left Column: Upload & Status */}
          <div className="lg:col-span-5 space-y-8">
            <section>
              <h2 className="text-3xl font-light mb-2 tracking-tight">Universal Auditor</h2>
              <p className="text-gray-500 leading-relaxed">
                Upload any financial document—ledgers, bank statements, or hand-drawn records. 
                Our AI identifies patterns, converts currencies, and flags risks instantly.
              </p>
            </section>

            <div 
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "group relative border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer",
                file ? "border-emerald-500 bg-emerald-50/30" : "border-gray-200 hover:border-emerald-400 hover:bg-gray-50"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileChange} 
                className="hidden" 
                accept=".pdf,.xlsx,.csv,.jpg,.png,.jpeg"
              />
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  file ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                )}>
                  {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>
                <div>
                  <p className="font-medium text-lg">
                    {file ? file.name : "Drop financial file here"}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    PDF, Excel, CSV, or Images (Max 20MB)
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-sm"
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white rounded-2xl border border-black/5 shadow-sm">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Base Currency</p>
                <p className="text-2xl font-semibold">BHD</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-black/5 shadow-sm">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Audit Mode</p>
                <p className="text-2xl font-semibold">AML/KYC</p>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!result && !isProcessing ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border border-black/5 bg-white rounded-3xl"
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Search className="text-gray-300 w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-400">Awaiting Document</h3>
                  <p className="text-gray-400 max-w-xs mt-2">
                    Upload a file to begin the automated financial audit and risk assessment.
                  </p>
                </motion.div>
              ) : isProcessing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-6"
                >
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-emerald-100 rounded-full" />
                    <div className="absolute top-0 left-0 w-24 h-24 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-medium">Analyzing Ledger...</h3>
                    <p className="text-gray-400 mt-2">Parsing transactions and detecting anomalies</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Risk Badge */}
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                    result.riskLevel === 'Low' ? "bg-emerald-100 text-emerald-700" :
                    result.riskLevel === 'Medium' ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    <AlertTriangle className="w-4 h-4" />
                    Risk Level: {result.riskLevel}
                  </div>

                  {/* Key Metrics */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-8 bg-white rounded-3xl border border-black/5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <DollarSign className="text-gray-400 w-5 h-5" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Volume</span>
                      </div>
                      <p className="text-3xl font-bold tracking-tight">
                        {result.totalVolume.toLocaleString()} <span className="text-lg font-medium text-gray-400">{result.currency}</span>
                      </p>
                    </div>
                    <div className="p-8 bg-emerald-600 text-white rounded-3xl shadow-lg shadow-emerald-200">
                      <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="text-emerald-200 w-5 h-5" />
                        <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Base (BHD)</span>
                      </div>
                      <p className="text-3xl font-bold tracking-tight">
                        {result.baseCurrencyVolume.toLocaleString()} <span className="text-lg font-medium text-emerald-200">BHD</span>
                      </p>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="bg-white rounded-3xl border border-black/5 p-8 space-y-6">
                    <div className="flex items-center gap-2 text-gray-400">
                      <FileText className="w-5 h-5" />
                      <h4 className="text-sm font-bold uppercase tracking-widest">Audit Summary</h4>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                      <Markdown>{result.summary}</Markdown>
                    </div>
                    <div className="pt-6 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                      <span>Detected Range: {result.detectedDateRange}</span>
                      <span>System: v2.4-Audit</span>
                    </div>
                  </div>

                  {/* Anomalies */}
                  {result.anomalies.length > 0 && (
                    <div className="bg-red-50/50 border border-red-100 rounded-3xl p-8">
                      <div className="flex items-center gap-2 text-red-600 mb-6">
                        <AlertTriangle className="w-5 h-5" />
                        <h4 className="text-sm font-bold uppercase tracking-widest">AML Red Flags Detected</h4>
                      </div>
                      <ul className="space-y-4">
                        {result.anomalies.map((anomaly, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-red-800">
                            <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />
                            {anomaly}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-gray-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-medium">Enterprise Grade Security</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Audit Standards</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">API Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
