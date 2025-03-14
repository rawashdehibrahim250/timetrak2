import React, { useState, useEffect } from 'react';
import { summarizeText } from '../lib/ai';

interface DescriptionFieldProps {
  description: string;
  setDescription: (value: string) => void;
  showSummary?: boolean;
}

const DescriptionField: React.FC<DescriptionFieldProps> = ({ 
  description, 
  setDescription, 
  showSummary = false 
}) => {
  const [summary, setSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  useEffect(() => {
    // Generate summary when description changes and is long enough
    if (showSummary && description.length > 50) {
      const generateSummary = async () => {
        setIsGeneratingSummary(true);
        try {
          const result = await summarizeText(description);
          setSummary(result);
        } catch (error) {
          console.error('Failed to generate summary:', error);
        } finally {
          setIsGeneratingSummary(false);
        }
      };
      
      // Debounce summary generation to avoid too many calls
      const timer = setTimeout(() => {
        generateSummary();
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setSummary('');
    }
  }, [description, showSummary]);

  return (
    <div className="space-y-2">
      <label htmlFor="description" className="form-label">
        Description
      </label>
      <textarea
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        rows={4}
        className="form-input font-sans resize-y text-sm md:text-base"
        placeholder="What did you work on? Provide detailed information about your tasks and accomplishments."
      />
      {showSummary && description.length > 0 && (
        <div className="mt-2 md:mt-3 space-y-1.5">
          <label className="form-label flex items-center text-xs md:text-sm">
            <span>Summary</span>
            {isGeneratingSummary && (
              <span className="ml-2 inline-block h-3 w-3 md:h-4 md:w-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></span>
            )}
          </label>
          <div className="p-2 md:p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs md:text-sm text-neutral-700 transition-all duration-300">
            {isGeneratingSummary ? (
              <div className="animate-pulse text-neutral-400">Generating summary...</div>
            ) : summary ? (
              summary
            ) : (
              <span className="text-neutral-400 italic">Add more details to generate a summary</span>
            )}
          </div>
        </div>
      )}
      <div className="flex justify-between text-xs text-neutral-500">
        <span className="font-mono">{description.length} characters</span>
        {description.length > 500 && (
          <span className="text-amber-600 font-medium">
            Long descriptions will be summarized
          </span>
        )}
      </div>
    </div>
  );
};

export default DescriptionField;