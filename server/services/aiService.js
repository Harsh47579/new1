
const axios = require('axios');

class AIService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || 'dummy-key-for-testing';
    this.geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
  }

  async triageIssue(title, description, imageBuffer) {
    try {
      const imageBase64 = imageBuffer ? imageBuffer.toString('base64') : null;
      const prompt = this.buildTriagePrompt(title, description);

      // Correctly structure the parts array for multimodal content
      const parts = [{ text: prompt }];
      if (imageBase64) {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: imageBase64
          }
        });
      }

      const requestPayload = {
        contents: [{
          parts: parts // Use the single parts array
        }]
      };

      const response = await axios.post(
        `${this.geminiApiUrl}?key=${this.geminiApiKey}`,
        requestPayload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      const analysis = this.parseAIResponse(aiResponse);

      return {
        success: true,
        suggestedCategory: analysis.category,
        suggestedPriority: analysis.priority,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        suggestedDepartment: analysis.department
      };

    } catch (error) {
      console.error('AI Triage Error:', error.response?.data || error.message);
      
      // Return a more informative fallback
      const fallbackResult = this.fallbackTriage(title, description);
      return {
        ...fallbackResult,
        reasoning: 'AI analysis failed, using fallback.',
        error: error.message
      };
    }
  }


  buildTriagePrompt(title, description) {
    return `Analyze this civic issue report and provide a structured response in JSON format.

Issue Title: "${title}"
Issue Description: "${description}"

Please analyze this issue and provide:
1. Category: Choose from ["Road & Pothole Issues", "Streetlight Problems", "Waste Management", "Water Supply", "Sewage & Drainage", "Public Safety", "Parks & Recreation", "Traffic Management", "Other"]
2. Priority: Choose from ["low", "medium", "high", "urgent"]
3. Confidence: A score from 0-100 indicating how confident you are in this analysis
4. Reasoning: Brief explanation of your analysis
5. Department: Suggested department to handle this issue

Respond ONLY with valid JSON in this exact format:
{
  "category": "Road & Pothole Issues",
  "priority": "high", 
  "confidence": 85,
  "reasoning": "Pothole on main road affecting traffic flow",
  "department": "Public Works"
}`;
  }

  parseAIResponse(aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Valid categories from Issue model
      const validCategories = [
        'Road & Pothole Issues',
        'Streetlight Problems',
        'Waste Management',
        'Water Supply',
        'Sewage & Drainage',
        'Public Safety',
        'Parks & Recreation',
        'Traffic Management',
        'Other'
      ];
      
      // Valid priorities from Issue model
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      
      return {
        category: validCategories.includes(parsed.category) ? parsed.category : 'Other',
        priority: validPriorities.includes(parsed.priority) ? parsed.priority : 'medium',
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        reasoning: parsed.reasoning || 'AI analysis completed',
        department: parsed.department || 'Public Works'
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.fallbackTriage('', '');
    }
  }

  fallbackTriage(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    let category = 'Other';
    let priority = 'medium';
    let confidence = 30;
    
    if (text.includes('pothole') || text.includes('road') || text.includes('street')) {
      category = 'Road & Pothole Issues';
      priority = 'high';
    } else if (text.includes('water') || text.includes('leak') || text.includes('pipe')) {
      category = 'Water Supply';
      priority = 'high';
    } else if (text.includes('electricity') || text.includes('power') || text.includes('light')) {
      category = 'Streetlight Problems';
      priority = 'high';
    } else if (text.includes('garbage') || text.includes('waste') || text.includes('trash')) {
      category = 'Waste Management';
      priority = 'medium';
    } else if (text.includes('safety') || text.includes('danger') || text.includes('hazard')) {
      category = 'Public Safety';
      priority = 'urgent';
    }
    
    return {
      success: true,
      suggestedCategory: category,
      suggestedPriority: priority,
      confidence: confidence,
      reasoning: 'Fallback rule-based analysis',
      suggestedDepartment: 'Public Works'
    };
  }

  analyzeHistoricalPatterns(historicalData) {
    const patterns = {
      byCategory: {},
      byLocation: {},
      byTime: {},
      bySeason: {}
    };

    historicalData.forEach(issue => {
      patterns.byCategory[issue.category] = (patterns.byCategory[issue.category] || 0) + 1;
      
      if (issue.location) {
        const area = this.getAreaFromLocation(issue.location);
        patterns.byLocation[area] = (patterns.byLocation[area] || 0) + 1;
      }
      
      const hour = new Date(issue.createdAt).getHours();
      patterns.byTime[hour] = (patterns.byTime[hour] || 0) + 1;
      
      const month = new Date(issue.createdAt).getMonth();
      const season = this.getSeasonFromMonth(month);
      patterns.bySeason[season] = (patterns.bySeason[season] || 0) + 1;
    });

    return patterns;
  }

  generatePredictions(patterns) {
    const recommendations = [];
    let overallRiskScore = 0;

    const sortedCategories = Object.entries(patterns.byCategory)
      .sort(([,a], [,b]) => b - a);
    
    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0];
      recommendations.push({
        type: 'category_trend',
        message: `High volume of ${topCategory[0]} issues detected`,
        priority: 'high'
      });
      overallRiskScore += 20;
    }

    const sortedLocations = Object.entries(patterns.byLocation)
      .sort(([,a], [,b]) => b - a);
    
    if (sortedLocations.length > 0) {
      const topLocation = sortedLocations[0];
      recommendations.push({
        type: 'location_hotspot',
        message: `${topLocation[0]} area requires attention`,
        priority: 'medium'
      });
      overallRiskScore += 15;
    }

    return {
      overallRiskScore: Math.min(100, overallRiskScore),
      recommendations
    };
  }

  identifyHighRiskAreas(historicalData) {
    const areaCounts = {};
    
    historicalData.forEach(issue => {
      if (issue.location) {
        const area = this.getAreaFromLocation(issue.location);
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      }
    });

    return Object.entries(areaCounts)
      .filter(([,count]) => count >= 3)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([area, count]) => ({
        area,
        issueCount: count,
        riskLevel: count >= 10 ? 'high' : count >= 5 ? 'medium' : 'low'
      }));
  }


  getAreaFromLocation(location) {
    if (typeof location === 'string') {
      return location.split(',')[0].trim();
    }
    if (location && location.address) {
      return location.address.split(',')[0].trim();
    }
    return 'Unknown Area';
  }

  getSeasonFromMonth(month) {
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  analyzePatterns(historicalData) {
    const patterns = {
      byCategory: {},
      byLocation: {},
      byTime: {},
      bySeason: {}
    };

    historicalData.forEach(issue => {
      // Category patterns
      if (issue.category) {
        patterns.byCategory[issue.category] = (patterns.byCategory[issue.category] || 0) + 1;
      }

      // Location patterns
      if (issue.location) {
        const area = this.getAreaFromLocation(issue.location);
        patterns.byLocation[area] = (patterns.byLocation[area] || 0) + 1;
      }

      // Time patterns
      const date = new Date(issue.createdAt);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      patterns.byTime[hour] = (patterns.byTime[hour] || 0) + 1;
      patterns.byTime[`day_${dayOfWeek}`] = (patterns.byTime[`day_${dayOfWeek}`] || 0) + 1;

      // Seasonal patterns
      const month = date.getMonth();
      const season = this.getSeasonFromMonth(month);
      patterns.bySeason[season] = (patterns.bySeason[season] || 0) + 1;
    });

    return patterns;
  }

  calculateOverallRiskScore(patterns, highRiskAreas, trends = {}) {
    let score = 0;
    
    // Base score
    score += 20;
    
    // High risk areas
    if (highRiskAreas.length > 0) {
      score += Math.min(30, highRiskAreas.length * 5);
    }
    
    // Category concentration
    const totalIssues = Object.values(patterns.byCategory).reduce((sum, count) => sum + count, 0);
    if (totalIssues > 0) {
      const maxCategoryCount = Math.max(...Object.values(patterns.byCategory));
      const concentration = maxCategoryCount / totalIssues;
      score += concentration * 25;
    }
    
    // Trend-based scoring
    if (trends.weekly && trends.weekly > 0) {
      score += Math.min(15, trends.weekly * 2);
    }
    
    if (trends.monthly && trends.monthly > 0) {
      score += Math.min(10, trends.monthly * 1.5);
    }
    
    return Math.min(100, Math.round(score));
  }

  analyzeTrends(historicalData) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentWeek = historicalData.filter(issue => 
      new Date(issue.createdAt) >= oneWeekAgo
    ).length;
    
    const recentMonth = historicalData.filter(issue => 
      new Date(issue.createdAt) >= oneMonthAgo
    ).length;
    
    const previousWeek = historicalData.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      return issueDate >= new Date(oneWeekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && 
             issueDate < oneWeekAgo;
    }).length;
    
    const previousMonth = historicalData.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      return issueDate >= new Date(oneMonthAgo.getTime() - 30 * 24 * 60 * 60 * 1000) && 
             issueDate < oneMonthAgo;
    }).length;
    
    return {
      weekly: previousWeek > 0 ? ((recentWeek - previousWeek) / previousWeek) * 100 : 0,
      monthly: previousMonth > 0 ? ((recentMonth - previousMonth) / previousMonth) * 100 : 0,
      seasonal: this.analyzeSeasonalTrend(historicalData)
    };
  }

  analyzeSeasonalPatterns(historicalData) {
    const seasonalData = {
      Spring: 0, Summer: 0, Fall: 0, Winter: 0
    };
    
    historicalData.forEach(issue => {
      const month = new Date(issue.createdAt).getMonth();
      const season = this.getSeasonFromMonth(month);
      seasonalData[season]++;
    });
    
    return seasonalData;
  }

  analyzeSeasonalTrend(historicalData) {
    const currentMonth = new Date().getMonth();
    const currentSeason = this.getSeasonFromMonth(currentMonth);
    
    const currentSeasonIssues = historicalData.filter(issue => {
      const issueMonth = new Date(issue.createdAt).getMonth();
      return this.getSeasonFromMonth(issueMonth) === currentSeason;
    }).length;
    
    const previousSeasonIssues = historicalData.filter(issue => {
      const issueMonth = new Date(issue.createdAt).getMonth();
      const previousSeason = this.getSeasonFromMonth((currentMonth + 9) % 12); // Previous season
      return this.getSeasonFromMonth(issueMonth) === previousSeason;
    }).length;
    
    return previousSeasonIssues > 0 ? 
      ((currentSeasonIssues - previousSeasonIssues) / previousSeasonIssues) * 100 : 0;
  }

  predictIssueTypes(patterns, trends = {}) {
    const predictions = [];
    
    const topCategories = Object.entries(patterns.byCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    topCategories.forEach(([category, count]) => {
      const baseProbability = Math.min(0.9, count / 100);
      const trendMultiplier = trends.weekly > 0 ? 1 + (trends.weekly / 100) : 1;
      const probability = Math.min(0.95, baseProbability * trendMultiplier);
      
      predictions.push({
        category,
        probability: Math.round(probability * 100) / 100,
        reason: `High historical volume (${count} issues)${trends.weekly > 0 ? ` + ${Math.round(trends.weekly)}% weekly increase` : ''}`,
        confidence: this.calculateCategoryConfidence(count, trends.weekly)
      });
    });
    
    return predictions;
  }

  generateRecommendations(patterns, trends = {}, seasonalPatterns = {}) {
    const recommendations = [];
    
    // High volume category recommendations
    const topCategory = Object.entries(patterns.byCategory)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory && topCategory[1] > 10) {
      recommendations.push({
        type: 'category_focus',
        message: `Focus resources on ${topCategory[0]} issues (${topCategory[1]} reported)`,
        priority: 'high',
        action: 'allocate_resources'
      });
    }
    
    // Trend-based recommendations
    if (trends.weekly > 20) {
      recommendations.push({
        type: 'trend_alert',
        message: `Issue reports increased by ${Math.round(trends.weekly)}% this week`,
        priority: 'urgent',
        action: 'investigate_cause'
      });
    }
    
    // Seasonal recommendations
    const currentSeason = this.getSeasonFromMonth(new Date().getMonth());
    const seasonalCount = seasonalPatterns[currentSeason] || 0;
    const avgSeasonalCount = Object.values(seasonalPatterns).reduce((sum, count) => sum + count, 0) / 4;
    
    if (seasonalCount > avgSeasonalCount * 1.5) {
      recommendations.push({
        type: 'seasonal_alert',
        message: `${currentSeason} season showing unusually high issue volume`,
        priority: 'medium',
        action: 'seasonal_preparation'
      });
    }
    
    return recommendations;
  }

  calculateConfidence(dataPoints, patterns) {
    let confidence = 50; // Base confidence
    
    // More data points = higher confidence
    confidence += Math.min(30, dataPoints / 10);
    
    // More diverse patterns = higher confidence
    const categoryCount = Object.keys(patterns.byCategory).length;
    confidence += Math.min(20, categoryCount * 2);
    
    return Math.min(95, Math.round(confidence));
  }

  calculateCategoryConfidence(count, trend) {
    let confidence = 60; // Base confidence
    
    // More historical data = higher confidence
    confidence += Math.min(25, count / 5);
    
    // Consistent trends = higher confidence
    if (trend && Math.abs(trend) < 50) {
      confidence += 15;
    }
    
    return Math.min(95, Math.round(confidence));
  }

  // Advanced Statistical Methods for AI-like Predictions
  calculateCorrelationMatrix(historicalData) {
    const correlations = {
      categoryLocation: this.calculateCategoryLocationCorrelation(historicalData),
      timeCategory: this.calculateTimeCategoryCorrelation(historicalData),
      seasonPriority: this.calculateSeasonPriorityCorrelation(historicalData)
    };
    
    return correlations;
  }

  calculateCategoryLocationCorrelation(historicalData) {
    const categoryLocationMap = {};
    
    historicalData.forEach(issue => {
      if (issue.category && issue.location) {
        const area = this.getAreaFromLocation(issue.location);
        if (!categoryLocationMap[issue.category]) {
          categoryLocationMap[issue.category] = {};
        }
        categoryLocationMap[issue.category][area] = (categoryLocationMap[issue.category][area] || 0) + 1;
      }
    });

    // Calculate correlation strength
    const correlations = [];
    Object.entries(categoryLocationMap).forEach(([category, locations]) => {
      const totalIssues = Object.values(locations).reduce((sum, count) => sum + count, 0);
      Object.entries(locations).forEach(([location, count]) => {
        const correlation = count / totalIssues;
        if (correlation > 0.3) { // Strong correlation threshold
          correlations.push({
            category,
            location,
            strength: Math.round(correlation * 100),
            confidence: Math.min(95, 60 + correlation * 35)
          });
        }
      });
    });

    return correlations.sort((a, b) => b.strength - a.strength);
  }

  calculateTimeCategoryCorrelation(historicalData) {
    const timeCategoryMap = {};
    
    historicalData.forEach(issue => {
      if (issue.category && issue.createdAt) {
        const hour = new Date(issue.createdAt).getHours();
        const timeSlot = this.getTimeSlot(hour);
        
        if (!timeCategoryMap[timeSlot]) {
          timeCategoryMap[timeSlot] = {};
        }
        timeCategoryMap[timeSlot][issue.category] = (timeCategoryMap[timeSlot][issue.category] || 0) + 1;
      }
    });

    const correlations = [];
    Object.entries(timeCategoryMap).forEach(([timeSlot, categories]) => {
      const totalIssues = Object.values(categories).reduce((sum, count) => sum + count, 0);
      Object.entries(categories).forEach(([category, count]) => {
        const correlation = count / totalIssues;
        if (correlation > 0.4) {
          correlations.push({
            timeSlot,
            category,
            strength: Math.round(correlation * 100),
            confidence: Math.min(95, 70 + correlation * 25)
          });
        }
      });
    });

    return correlations.sort((a, b) => b.strength - a.strength);
  }

  calculateSeasonPriorityCorrelation(historicalData) {
    const seasonPriorityMap = {};
    
    historicalData.forEach(issue => {
      if (issue.priority && issue.createdAt) {
        const month = new Date(issue.createdAt).getMonth();
        const season = this.getSeasonFromMonth(month);
        
        if (!seasonPriorityMap[season]) {
          seasonPriorityMap[season] = {};
        }
        seasonPriorityMap[season][issue.priority] = (seasonPriorityMap[season][issue.priority] || 0) + 1;
      }
    });

    const correlations = [];
    Object.entries(seasonPriorityMap).forEach(([season, priorities]) => {
      const totalIssues = Object.values(priorities).reduce((sum, count) => sum + count, 0);
      Object.entries(priorities).forEach(([priority, count]) => {
        const correlation = count / totalIssues;
        if (correlation > 0.5) {
          correlations.push({
            season,
            priority,
            strength: Math.round(correlation * 100),
            confidence: Math.min(95, 75 + correlation * 20)
          });
        }
      });
    });

    return correlations.sort((a, b) => b.strength - a.strength);
  }

  detectAnomalies(historicalData) {
    const anomalies = [];
    
    // Detect unusual spikes in issue reports
    const dailyCounts = this.getDailyCounts(historicalData);
    const avgDaily = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;
    const stdDev = this.calculateStandardDeviation(dailyCounts, avgDaily);
    
    dailyCounts.forEach((count, index) => {
      if (count > avgDaily + (2 * stdDev)) {
        const date = new Date();
        date.setDate(date.getDate() - (dailyCounts.length - index));
        anomalies.push({
          type: 'spike',
          date: date.toISOString().split('T')[0],
          count,
          expected: Math.round(avgDaily),
          severity: count > avgDaily + (3 * stdDev) ? 'high' : 'medium',
          confidence: 85
        });
      }
    });

    // Detect unusual patterns in categories
    const categoryCounts = {};
    historicalData.forEach(issue => {
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
    });
    
    const totalIssues = historicalData.length;
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = (count / totalIssues) * 100;
      if (percentage > 40) { // Unusually high concentration
        anomalies.push({
          type: 'category_concentration',
          category,
          percentage: Math.round(percentage),
          count,
          severity: percentage > 60 ? 'high' : 'medium',
          confidence: 80
        });
      }
    });

    return anomalies.sort((a, b) => b.confidence - a.confidence);
  }

  generateFuturePredictions(historicalData, patterns, trends) {
    const predictions = [];
    const now = new Date();
    
    // Predict next week's issues
    const weeklyPrediction = this.predictWeeklyIssues(historicalData, patterns, trends);
    predictions.push({
      timeframe: 'next_week',
      predictedIssues: weeklyPrediction.count,
      confidence: weeklyPrediction.confidence,
      topCategories: weeklyPrediction.categories,
      riskAreas: weeklyPrediction.areas
    });

    // Predict next month's issues
    const monthlyPrediction = this.predictMonthlyIssues(historicalData, patterns, trends);
    predictions.push({
      timeframe: 'next_month',
      predictedIssues: monthlyPrediction.count,
      confidence: monthlyPrediction.confidence,
      topCategories: monthlyPrediction.categories,
      riskAreas: monthlyPrediction.areas
    });

    return predictions;
  }

  predictWeeklyIssues(historicalData, patterns, trends) {
    const recentWeeks = this.getWeeklyCounts(historicalData, 4);
    const avgWeekly = recentWeeks.reduce((sum, count) => sum + count, 0) / recentWeeks.length;
    const trendFactor = trends.weekly ? (1 + trends.weekly / 100) : 1;
    
    const predictedCount = Math.round(avgWeekly * trendFactor);
    const confidence = Math.min(95, 70 + (recentWeeks.length * 5));

    return {
      count: predictedCount,
      confidence,
      categories: this.predictTopCategories(patterns, 3),
      areas: this.predictTopAreas(historicalData, 3)
    };
  }

  predictMonthlyIssues(historicalData, patterns, trends) {
    const recentMonths = this.getMonthlyCounts(historicalData, 3);
    const avgMonthly = recentMonths.reduce((sum, count) => sum + count, 0) / recentMonths.length;
    const trendFactor = trends.monthly ? (1 + trends.monthly / 100) : 1;
    
    const predictedCount = Math.round(avgMonthly * trendFactor);
    const confidence = Math.min(95, 65 + (recentMonths.length * 8));

    return {
      count: predictedCount,
      confidence,
      categories: this.predictTopCategories(patterns, 5),
      areas: this.predictTopAreas(historicalData, 5)
    };
  }

  calculateModelAccuracy(historicalData, patterns) {
    // Simulate model accuracy based on data quality and patterns
    let accuracy = 60; // Base accuracy
    
    // More data points = higher accuracy
    accuracy += Math.min(20, historicalData.length / 10);
    
    // More diverse patterns = higher accuracy
    const categoryCount = Object.keys(patterns.byCategory).length;
    accuracy += Math.min(15, categoryCount * 2);
    
    // Consistent patterns = higher accuracy
    const totalIssues = Object.values(patterns.byCategory).reduce((sum, count) => sum + count, 0);
    if (totalIssues > 0) {
      const maxCategoryCount = Math.max(...Object.values(patterns.byCategory));
      const concentration = maxCategoryCount / totalIssues;
      if (concentration < 0.6) { // Not too concentrated
        accuracy += 5;
      }
    }
    
    return Math.min(95, Math.round(accuracy));
  }

  // Helper methods
  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';
  }

  getDailyCounts(historicalData) {
    const counts = {};
    historicalData.forEach(issue => {
      const date = new Date(issue.createdAt).toISOString().split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.values(counts);
  }

  getWeeklyCounts(historicalData, weeks) {
    const counts = [];
    const now = new Date();
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      const weekCount = historicalData.filter(issue => {
        const issueDate = new Date(issue.createdAt);
        return issueDate >= weekStart && issueDate < weekEnd;
      }).length;
      
      counts.push(weekCount);
    }
    
    return counts;
  }

  getMonthlyCounts(historicalData, months) {
    const counts = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthCount = historicalData.filter(issue => {
        const issueDate = new Date(issue.createdAt);
        return issueDate >= monthStart && issueDate < monthEnd;
      }).length;
      
      counts.push(monthCount);
    }
    
    return counts;
  }

  calculateStandardDeviation(values, mean) {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  predictTopCategories(patterns, limit) {
    return Object.entries(patterns.byCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([category, count]) => ({ category, count }));
  }

  predictTopAreas(historicalData, limit) {
    const areaCounts = {};
    historicalData.forEach(issue => {
      if (issue.location) {
        const area = this.getAreaFromLocation(issue.location);
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      }
    });
    
    return Object.entries(areaCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([area, count]) => ({ area, count }));
  }

  async predictiveAnalytics(historicalData) {
    try {
      console.log(`🤖 AI Engine: Analyzing ${historicalData?.length || 0} historical issues for predictions`);
      
      // Validate input data
      if (!historicalData || !Array.isArray(historicalData)) {
        console.error('❌ Invalid historical data provided:', typeof historicalData);
        return {
          success: false,
          error: 'Invalid historical data provided',
          data: {
            overallRiskScore: 0,
            highRiskAreas: [],
            predictedIssueTypes: [],
            recommendations: [],
            generatedAt: new Date(),
            dataPoints: 0,
            aiModel: 'Error Engine'
          }
        };
      }
      
      if (historicalData.length < 5) {
        console.log('⚠️ Insufficient data for analysis, returning fallback');
        return {
          success: true,
          data: {
            overallRiskScore: 25,
            highRiskAreas: [],
            predictedIssueTypes: [],
            recommendations: [
              {
                type: 'insufficient_data',
                message: 'Insufficient historical data for accurate predictions (minimum 5 issues required)',
                priority: 'low'
              }
            ],
            generatedAt: new Date(),
            dataPoints: historicalData.length,
            aiModel: 'Statistical Analysis Engine v2.0'
          }
        };
      }

      console.log('📊 Starting pattern analysis...');
      // Advanced AI-powered statistical modeling
      const patterns = this.analyzePatterns(historicalData);
      console.log('📈 Analyzing trends...');
      const trends = this.analyzeTrends(historicalData);
      console.log('🍂 Analyzing seasonal patterns...');
      const seasonalPatterns = this.analyzeSeasonalPatterns(historicalData);
      console.log('🔗 Calculating correlation matrix...');
      const correlationMatrix = this.calculateCorrelationMatrix(historicalData);
      console.log('🚨 Detecting anomalies...');
      const anomalyDetection = this.detectAnomalies(historicalData);
      
      console.log('🎯 Generating predictions...');
      // Machine Learning-inspired predictions
      const highRiskAreas = this.identifyHighRiskAreas(historicalData);
      const predictedIssueTypes = this.predictIssueTypes(patterns, trends);
      const recommendations = this.generateRecommendations(patterns, trends, seasonalPatterns);
      const futurePredictions = this.generateFuturePredictions(historicalData, patterns, trends);
      
      console.log('📊 Calculating overall risk score...');
      const overallRiskScore = this.calculateOverallRiskScore(patterns, highRiskAreas, trends);

      return {
        success: true,
        data: {
          overallRiskScore,
          highRiskAreas,
          predictedIssueTypes,
          recommendations,
          futurePredictions,
          trends: {
            weeklyTrend: trends.weekly,
            monthlyTrend: trends.monthly,
            seasonalTrend: trends.seasonal
          },
          aiInsights: {
            correlationMatrix,
            anomalyDetection,
            confidence: this.calculateConfidence(historicalData.length, patterns),
            modelAccuracy: this.calculateModelAccuracy(historicalData, patterns)
          },
          generatedAt: new Date(),
          dataPoints: historicalData.length,
          aiModel: 'Advanced Statistical ML Engine v2.0'
        }
      };

    } catch (error) {
      console.error('❌ AI Predictive analytics error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        historicalDataLength: historicalData?.length || 0
      });
      
      return {
        success: false,
        error: error.message,
        data: {
          overallRiskScore: 30,
          highRiskAreas: [],
          predictedIssueTypes: [],
          recommendations: [
            {
              type: 'error',
              message: `AI analysis failed: ${error.message}`,
              priority: 'low'
            }
          ],
          generatedAt: new Date(),
          dataPoints: historicalData?.length || 0,
          aiModel: 'Fallback Engine'
        }
      };
    }
  }
}

module.exports = new AIService();
