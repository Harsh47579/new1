import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Copy,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AIAssistant = ({ onAnalysisComplete, onReset }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const analyzeIssue = async (title, description, location) => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please enter both title and description');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await axios.post('/api/ai/analyze-issue', {
        title,
        description,
        location
      });

      if (response.data.success) {
        setAnalysis(response.data.analysis);
        onAnalysisComplete(response.data.analysis);
        toast.success('AI analysis completed!');
      } else {
        toast.error('Failed to analyze issue');
      }
    } catch (error) {
      console.error('Error analyzing issue:', error);
      toast.error('Error analyzing issue');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestion) => {
    onAnalysisComplete({
      ...analysis,
      suggestedDescription: suggestion
    });
    toast.success('Suggestion applied!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setShowSuggestions(false);
    onReset();
  };

  return (
    <div className="bg-gradient-to-br from-primary-500/10 to-purple-500/10 border border-primary-500/20 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-primary-500/20 rounded-lg mr-3">
          <Bot className="w-6 h-6 text-primary-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
          <p className="text-sm text-dark-300">Get smart suggestions for your issue report</p>
        </div>
      </div>

      {!analysis ? (
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-primary-500 mx-auto mb-4" />
          <p className="text-dark-300 mb-4">
            Enter your issue details and let AI help you categorize and improve your report
          </p>
          <div className="text-sm text-dark-400">
            <p>• Automatic category detection</p>
            <p>• Priority assessment</p>
            <p>• Description enhancement</p>
            <p>• Smart suggestions</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Analysis Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Suggested Category
              </h4>
              <p className="text-primary-500 font-medium">{analysis.suggestedCategory}</p>
              <p className="text-sm text-dark-300 mt-1">
                Confidence: {Math.round(analysis.confidence * 100)}%
              </p>
            </div>

            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                Suggested Priority
              </h4>
              <p className={`font-medium capitalize ${
                analysis.suggestedPriority === 'high' ? 'text-red-500' :
                analysis.suggestedPriority === 'medium' ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {analysis.suggestedPriority}
              </p>
              <p className="text-sm text-dark-300 mt-1">
                {analysis.suggestedSubcategory}
              </p>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-dark-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">AI Insights</h4>
            <div className="space-y-2 text-sm">
              <p className="text-dark-300">{analysis.aiInsights.urgency}</p>
              <p className="text-dark-300">{analysis.aiInsights.category}</p>
            </div>
          </div>

          {/* Enhanced Description */}
          {analysis.enhancedDescription && (
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Enhanced Description</h4>
              <div className="bg-dark-800 rounded p-3 mb-3">
                <p className="text-dark-300 text-sm">{analysis.enhancedDescription}</p>
              </div>
              <button
                onClick={() => copyToClipboard(analysis.enhancedDescription)}
                className="btn-outline text-sm flex items-center space-x-1"
              >
                <Copy size={14} />
                <span>Copy Enhanced Description</span>
              </button>
            </div>
          )}

          {/* Description Suggestions */}
          {analysis.descriptionSuggestions && analysis.descriptionSuggestions.length > 0 && (
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Description Suggestions</h4>
              <div className="space-y-2">
                {analysis.descriptionSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-dark-300 text-sm">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="btn-primary text-sm flex items-center space-x-1"
            >
              <Sparkles size={14} />
              <span>{showSuggestions ? 'Hide' : 'Show'} Suggestions</span>
            </button>
            <button
              onClick={resetAnalysis}
              className="btn-outline text-sm flex items-center space-x-1"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
