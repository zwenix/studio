export const LESSON_STUDIO_SCHEMA_HINT = \`
Expected JSON shape:
{
  "title": "string",
  "subject": "string",
  "grade": "string",
  "term": "string",
  "topic": "string",
  "caps_alignment": {
    "summary": "string",
    "assumptions": ["string"]
  },
  "lesson_overview": {
    "duration_minutes": 0,
    "learning_objectives": ["string"],
    "prior_knowledge": ["string"],
    "key_vocabulary": ["string"]
  },
  "resources": ["string"],
  "lesson_phases": {
    "hook": {
      "duration_minutes": 0,
      "teacher_actions": ["string"],
      "learner_actions": ["string"]
    },
    "direct_instruction": {
      "duration_minutes": 0,
      "teacher_actions": ["string"],
      "learner_actions": ["string"]
    },
    "guided_practice": {
      "duration_minutes": 0,
      "teacher_actions": ["string"],
      "learner_actions": ["string"]
    },
    "independent_practice": {
      "duration_minutes": 0,
      "activity": "string",
      "success_criteria": ["string"]
    },
    "assessment": {
      "type": "string",
      "task": "string",
      "criteria": ["string"]
    },
    "closure": {
      "duration_minutes": 0,
      "teacher_actions": ["string"],
      "learner_actions": ["string"]
    }
  },
  "differentiation": {
    "support": ["string"],
    "enrichment": ["string"]
  },
  "homework": "string",
  "teacher_notes": ["string"]
}
\`;

export const POSTER_SCHEMA_HINT = \`
Expected JSON shape:
{
  "content_type": "poster",
  "curriculum_alignment": {
    "subject": "string",
    "grade": "string",
    "topic": "string",
    "caps_summary": "string",
    "assumptions": ["string"]
  },
  "learning_goal": "string",
  "target_learners": {
    "age_range": "string",
    "reading_level": "string",
    "classroom_use": "string"
  },
  "poster_text": {
    "title": "string",
    "subtitle": "string",
    "key_points": ["string"],
    "labels": ["string"],
    "callout_boxes": ["string"]
  },
  "design_spec": {
    "orientation": "portrait | landscape",
    "layout_structure": "string",
    "visual_hierarchy": {
      "primary_focus": "string",
      "secondary_elements": ["string"],
      "text_priority": ["string"]
    },
    "typography_guidelines": {
      "title_style": "string",
      "body_style": "string",
      "minimum_print_size_notes": "string"
    },
    "colour_palette": {
      "primary": ["string"],
      "accent": ["string"],
      "background": "string"
    },
    "spacing_notes": ["string"],
    "print_notes": ["string"]
  },
  "visual_brief": {
    "main_scene": "string",
    "educational_elements_to_show": ["string"],
    "south_african_context_elements": ["string"],
    "what_to_avoid": ["string"]
  },
  "image_prompt": "string",
  "teacher_notes": {
    "how_to_introduce": "string",
    "discussion_questions": ["string"],
    "follow_up_activity": "string"
  }
}
\`;

export const WORKSHEET_SCHEMA_HINT = \`
Expected JSON shape:
{
  "content_type": "worksheet",
  "title": "string",
  "instructions": ["string"],
  "curriculum_alignment": {
    "subject": "string",
    "grade": "string",
    "topic": "string",
    "caps_summary": "string",
    "assumptions": ["string"]
  },
  "skills_targeted": ["string"],
  "worksheet_sections": [
    {
      "section_title": "string",
      "section_instructions": "string",
      "questions": [
        {
          "number": 1,
          "type": "string",
          "question": "string",
          "marks": 0
        }
      ]
    }
  ],
  "memo_if_requested": {
    "included": true,
    "answers": [
      {
        "question_number": 1,
        "answer": "string"
      }
    ]
  },
  "visual_brief": {
    "needed": false,
    "purpose": "string",
    "description": "string"
  },
  "image_prompt": "string",
  "formatting_notes": ["string"]
}
\`;

export const STUDY_GUIDE_SCHEMA_HINT = \`
Expected JSON shape:
{
  "content_type": "study_guide",
  "title": "string",
  "curriculum_alignment": {
    "subject": "string",
    "grade": "string",
    "topic": "string",
    "caps_summary": "string",
    "assumptions": ["string"]
  },
  "key_terms": [
    {
      "term": "string",
      "definition": "string"
    }
  ],
  "summary_sections": [
    {
      "heading": "string",
      "content": ["string"]
    }
  ],
  "worked_examples": [
    {
      "title": "string",
      "steps": ["string"]
    }
  ],
  "common_errors": ["string"],
  "self_check": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "design_notes": ["string"]
}
\`;

export const ASSESSMENT_SCHEMA_HINT = \`
Expected JSON shape:
{
  "paper_title": "string",
  "instructions": ["string"],
  "curriculum_alignment": {
    "subject": "string",
    "grade": "string",
    "term": "string",
    "topics": ["string"],
    "caps_summary": "string",
    "assumptions": ["string"]
  },
  "question_sections": [
    {
      "section_title": "string",
      "questions": [
        {
          "number": "string",
          "question_text": "string",
          "marks": 0,
          "cognitive_level": "string"
        }
      ]
    }
  ],
  "total_marks": 0,
  "estimated_duration": "string",
  "cognitive_distribution": [
    {
      "level": "string",
      "description": "string",
      "approx_marks": 0
    }
  ],
  "quality_checks": ["string"]
}
\`;

export const MEMO_SCHEMA_HINT = \`
Expected JSON shape:
{
  "memo_title": "string",
  "question_by_question_answers": [
    {
      "question_number": "string",
      "answer": "string",
      "marks": 0
    }
  ],
  "mark_allocations": [
    {
      "question_number": "string",
      "allocation": "string"
    }
  ],
  "acceptable_alternatives": [
    {
      "question_number": "string",
      "alternatives": ["string"]
    }
  ],
  "moderation_notes": ["string"],
  "common_learner_errors": ["string"]
}
\`;

export const AUTOGRADER_SCHEMA_HINT = \`
Expected JSON shape:
{
  "overall_level": "string",
  "criterion_scores": [
    {
      "criterion": "string",
      "level": "string",
      "justification": "string",
      "improvement": "string"
    }
  ],
  "total_score_if_applicable": "string",
  "strengths": ["string"],
  "next_steps": ["string"],
  "learner_friendly_feedback": "string",
  "teacher_feedback": "string"
}
\`;

export const OCR_SCHEMA_HINT = \`
Expected JSON shape:
{
  "extracted_text": "string",
  "detected_language": "string",
  "confidence_notes": ["string"],
  "unclear_segments": ["string"]
}
\`;

export const CAPS_REVIEW_SCHEMA_HINT = \`
Expected JSON shape:
{
  "overall_verdict": "string",
  "strengths": ["string"],
  "risks": ["string"],
  "required_fixes": ["string"],
  "revised_version_if_needed": {}
}
\`;
