import axios from 'axios';

class AIService {
  // Generate detailed description based on category and basic info
  static async generateDescription(category, title, issueLocation) {
    try {
      const response = await axios.post('/api/ai/generate-description', {
        category,
        title,
        location: issueLocation
      });

      if (response.data.success) {
        return response.data.description;
      }
      return null;
    } catch (error) {
      console.error('Error generating description:', error);
      return null;
    }
  }

  // Real-time AI analysis for issue triage
  static async analyzeIssue(title, description, imageFile) {
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await axios.post('/api/ai/analyze-issue', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return response.data.analysis;
      }
      return null;
    } catch (error) {
      console.error('Error analyzing issue:', error);
      return null;
    }
  }

  // Get category-specific description templates
  static getDescriptionTemplates(category) {
    const templates = {
      'Road & Pothole Issues': {
        template: `I am reporting a ${category.toLowerCase()} in the area. 

The issue involves: [Describe the specific problem - pothole size, depth, road condition, etc.]

Location details: [Specific landmarks, street names, or nearby buildings]

Impact on community: [How this affects pedestrians, vehicles, or daily commute]

Additional observations: [Time of day when noticed, weather conditions, any safety concerns]

I believe this issue requires ${this.getPriorityForCategory(category)} attention as it ${this.getImpactDescription(category)}.`,
        suggestions: [
          'Measure the pothole dimensions if possible',
          'Note any nearby traffic signs or landmarks',
          'Mention if it affects both lanes or just one',
          'Include photos showing the depth and surrounding area'
        ]
      },
      'Streetlight Problems': {
        template: `I am reporting a ${category.toLowerCase()} in the area.

The streetlight issue: [Describe the problem - completely out, flickering, damaged pole, etc.]

Exact location: [Pole number if visible, nearby addresses, or specific intersection]

Time observed: [When you first noticed the issue and if it's consistent]

Safety concerns: [How the lack of lighting affects pedestrian/vehicle safety]

Additional details: [Any visible damage to the pole, wiring, or light fixture]

This lighting issue creates a safety hazard and should be addressed ${this.getPriorityForCategory(category)}.`,
        suggestions: [
          'Note the pole number if visible',
          'Check if other lights in the area are working',
          'Mention the time when you observed the issue',
          'Include photos of the pole and surrounding area'
        ]
      },
      'Waste Management': {
        template: `I am reporting a ${category.toLowerCase()} in the area.

Waste accumulation details: [Type of waste, amount, duration of accumulation]

Specific location: [Exact spot where waste is dumped, near which building/landmark]

Health and environmental impact: [Odor, potential health hazards, environmental concerns]

Collection schedule: [If you know the regular collection days]

Community impact: [How this affects residents, pedestrians, or local businesses]

This waste management issue requires ${this.getPriorityForCategory(category)} attention to maintain cleanliness and public health.`,
        suggestions: [
          'Describe the type and amount of waste',
          'Note any foul smell or health concerns',
          'Check if waste bins are available nearby',
          'Include photos showing the extent of accumulation'
        ]
      },
      'Water Supply': {
        template: `I am reporting a ${category.toLowerCase()} in the area.

Water supply issue: [No water, low pressure, water quality, leak, etc.]

Affected area: [Specific buildings, streets, or entire neighborhood]

Duration: [How long the issue has been ongoing]

Visible signs: [Leaking pipes, water pooling, discolored water, etc.]

Impact on residents: [How this affects daily life, businesses, or essential services]

This water supply issue needs ${this.getPriorityForCategory(category)} resolution as it affects essential services.`,
        suggestions: [
          'Check if the issue affects multiple buildings',
          'Note the duration of the problem',
          'Look for visible signs of pipe damage',
          'Include photos of any visible issues'
        ]
      },
      'Sewage & Drainage': {
        template: `I am reporting a ${category.toLowerCase()} in the area.

Drainage/sewage problem: [Blocked drain, overflow, flooding, sewage backup, etc.]

Location specifics: [Exact spot, nearby manholes, or affected streets]

Extent of problem: [Area affected, depth of water, duration of issue]

Health concerns: [Foul smell, standing water, potential contamination]

Weather correlation: [If the issue worsens during rain or specific conditions]

This drainage issue requires ${this.getPriorityForCategory(category)} attention to prevent health hazards and property damage.`,
        suggestions: [
          'Take photos of the drainage issue',
          'Note any foul smells or health concerns',
          'Check if it affects multiple areas',
          'Include photos showing the extent of the problem'
        ]
      },
      'Public Safety': {
        template: `I am reporting a ${category.toLowerCase()} in the area.

Safety concern: [Specific safety issue, hazard, or security problem]

Exact location: [Precise spot where the safety issue exists]

Time and circumstances: [When observed, what was happening]

Immediate risk: [Level of danger to public safety]

Recommended action: [What you think should be done immediately]

This safety issue requires ${this.getPriorityForCategory(category)} attention to protect public safety.`,
        suggestions: [
          'Report immediately if there is immediate danger',
          'Take photos only if safe to do so',
          'Note the exact time and circumstances',
          'Contact emergency services if needed'
        ]
      },
      'Parks & Recreation': {
        template: `I am reporting a ${category.toLowerCase()} in the area.

Facility issue: [Damaged equipment, maintenance problem, access issue, etc.]

Specific location: [Which park, playground, or recreational area]

Equipment details: [What specific equipment or facility is affected]

Safety impact: [How this affects users, especially children]

Usage impact: [How this limits recreational activities]

This park/recreation issue needs ${this.getPriorityForCategory(category)} attention to maintain community facilities.`,
        suggestions: [
          'Take photos of the damaged equipment',
          'Note any safety concerns for users',
          'Check if the facility is still accessible',
          'Include photos showing the extent of damage'
        ]
      },
      'Traffic Management': {
        template: `I am reporting a ${category.toLowerCase()} in the area.

Traffic issue: [Signal problem, sign damage, congestion, violation, etc.]

Exact location: [Specific intersection, street, or traffic control point]

Time of occurrence: [When the issue happens, peak hours, etc.]

Traffic impact: [How this affects traffic flow, safety, or efficiency]

Visibility concerns: [If signs or signals are not visible or working]

This traffic management issue requires ${this.getPriorityForCategory(category)} attention to maintain safe traffic flow.`,
        suggestions: [
          'Note the exact location of the traffic issue',
          'Report the time when the problem occurs',
          'Take photos if safe to do so',
          'Include photos showing the traffic control issue'
        ]
      }
    };

    return templates[category] || {
      template: `I am reporting an issue in the area.

Issue description: [Please provide detailed information about the problem]

Location: [Specific details about where the issue is located]

Impact: [How this affects the community or individuals]

Additional information: [Any other relevant details]

This issue requires attention to maintain community standards.`,
      suggestions: [
        'Provide as much detail as possible',
        'Include specific location information',
        'Note any safety concerns',
        'Take photos if helpful'
      ]
    };
  }

  static getPriorityForCategory(category) {
    const priorities = {
      'Public Safety': 'immediate',
      'Sewage & Drainage': 'immediate',
      'Water Supply': 'urgent',
      'Road & Pothole Issues': 'urgent',
      'Traffic Management': 'urgent',
      'Streetlight Problems': 'prompt',
      'Waste Management': 'prompt',
      'Parks & Recreation': 'routine'
    };
    return priorities[category] || 'urgent';
  }

  static getImpactDescription(category) {
    const impacts = {
      'Road & Pothole Issues': 'poses a risk to vehicles and pedestrians',
      'Streetlight Problems': 'creates safety hazards during nighttime',
      'Waste Management': 'affects public health and cleanliness',
      'Water Supply': 'disrupts essential services for residents',
      'Sewage & Drainage': 'creates health and environmental hazards',
      'Public Safety': 'poses immediate risks to public safety',
      'Parks & Recreation': 'limits community recreational activities',
      'Traffic Management': 'affects traffic flow and safety'
    };
    return impacts[category] || 'affects the community';
  }

  // Generate location-specific description
  static generateLocationDescription(location) {
    if (!location) return 'the area';
    
    const { lat, lng } = location;
    return `coordinates ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  // Create complete AI-generated description
  static createDescription(category, title, issueLocation, userInput = '') {
    const templates = this.getDescriptionTemplates(category);
    const locationDesc = this.generateLocationDescription(issueLocation);
    
    let description = templates.template.replace(/\[.*?\]/g, (match) => {
      const placeholder = match.slice(1, -1);
      switch (placeholder) {
        case 'Describe the specific problem - pothole size, depth, road condition, etc.':
          return userInput || 'Please provide specific details about the problem';
        case 'Specific landmarks, street names, or nearby buildings':
          return locationDesc;
        case 'How this affects pedestrians, vehicles, or daily commute':
          return this.getImpactDescription(category);
        case 'Time of day when noticed, weather conditions, any safety concerns':
          return 'Please add specific timing and conditions when you observed the issue';
        default:
          return userInput || 'Please provide additional details';
      }
    });

    return {
      description,
      suggestions: templates.suggestions,
      priority: this.getPriorityForCategory(category)
    };
  }
}

export default AIService;
