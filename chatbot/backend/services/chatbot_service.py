"""
Justice AI Chatbot Service
Handles complaint categorization, legal guidance, and optional GPT chat
"""

import json
import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
try:
    from groq import Groq
except ImportError:
    Groq = None


load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


class ChatbotService:
    """Main chatbot service for processing legal complaints and chat"""
    
    @staticmethod
    def detect_category(text: str) -> str:
        """
        Detect the complaint category based on keywords in user input.
        
        Args:
            text (str): User input text
            
        Returns:
            str: Detected category of complaint
        """
        text = text.lower().strip()
        
        # Cyber Fraud keywords
        cyber_keywords = ["scam", "fraud", "online", "phishing", "malware", "cyber", "hacking", "bitcoin", "cryptocurrency"]
        if any(keyword in text for keyword in cyber_keywords):
            return "Cyber Fraud"
        
        # Harassment keywords
        harassment_keywords = ["harassment", "abusive", "threatening", "stalking", "bullying", "threatening messages", "unwanted contact"]
        if any(keyword in text for keyword in harassment_keywords):
            return "Harassment"
        
        # Domestic Violence keywords
        dv_keywords = ["domestic", "violence", "abuse", "beating", "spouse", "family", "home abuse"]
        if any(keyword in text for keyword in dv_keywords):
            return "Domestic Violence"
        
        # Theft keywords
        theft_keywords = ["theft", "stolen", "robbery", "burglary", "stealing", "missing", "robbed", "stole", "thief"]
        if any(keyword in text for keyword in theft_keywords):
            return "Theft"
        
        return "General Complaint"
    
    @staticmethod
    def generate_response(category: str) -> dict:
        """
        Generate legal advice and guidance based on complaint category.
        
        Args:
            category (str): Type of complaint/crime
            
        Returns:
            dict: Legal section, advice, and escalation path
        """
        responses = {
            "Cyber Fraud": {
                "section": "IT Act 66C, IPC 420",
                "advice": "File complaint at nearest Cyber Cell immediately. Preserve all digital evidence (screenshots, links, transaction records).",
                "escalation": "If FIR not registered within 7 days, escalate to SP.",
                "helpline": "1930 (Cyber Crime Helpline)"
            },
            "Harassment": {
                "section": "IPC 354, 354A, 354D",
                "advice": "File FIR at nearest police station. Keep records of all harassment incidents with dates and times.",
                "escalation": "If ignored, escalate legally or approach Women's Commission.",
                "helpline": "1091 (Women Helpline)"
            },
            "Domestic Violence": {
                "section": "Protection of Women from Domestic Violence Act, IPC 498A",
                "advice": "Contact Women Helpline (1091) or Protection Officer. File petition under DV Act.",
                "escalation": "Approach Magistrate if no action taken. Seek temporary restraining orders.",
                "helpline": "1091 (Women Helpline)"
            },
            "Theft": {
                "section": "IPC 378, 379",
                "advice": "File theft complaint immediately at nearest police station with detailed description and item value.",
                "escalation": "Escalate to SP if FIR delayed. Consider civil suit for recovery.",
                "helpline": "100 (Police Emergency)"
            },
            "General Complaint": {
                "section": "To be determined",
                "advice": "Consult nearest police station or legal advisor for guidance.",
                "escalation": "Seek legal advice if no response within 30 days.",
                "helpline": "100 (Police Emergency)"
            }
        }
        
        return responses.get(category, responses["General Complaint"])

    @staticmethod
    def _parse_json_object(text: str) -> dict | None:
        if not text:
            return None

        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()

        try:
            return json.loads(cleaned)
        except Exception:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return None
            try:
                return json.loads(cleaned[start : end + 1])
            except Exception:
                return None

    @classmethod
    def _ai_process_complaint(cls, user_input: str) -> dict | None:
        prompt = (
            "You are an Indian legal guidance assistant. "
            "Return ONLY valid JSON with this schema: "
            "{"
            "\"category\": string, "
            "\"section\": string, "
            "\"advice\": string, "
            "\"escalation\": string, "
            "\"helpline\": string"
            "}. "
            "Pick a practical category like Cyber Fraud, Harassment, Domestic Violence, Theft, Property Dispute, Financial Fraud, or General Complaint. "
            "Keep advice actionable and concise."
        )

        ai = cls.chat_with_gpt(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_input},
            ],
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        )
        if not ai.get("success") or not ai.get("reply"):
            return None

        parsed = cls._parse_json_object(ai["reply"])
        if not parsed:
            return None

        category = str(parsed.get("category", "")).strip() or "General Complaint"
        section = str(parsed.get("section", "")).strip() or "To be determined"
        advice = str(parsed.get("advice", "")).strip() or "Consult nearest police station or legal advisor for guidance."
        escalation = str(parsed.get("escalation", "")).strip() or "Seek legal advice if no response within 30 days."
        helpline = str(parsed.get("helpline", "")).strip() or "100 (Police Emergency)"

        return {
            "success": True,
            "error": None,
            "category": category,
            "response": {
                "section": section,
                "advice": advice,
                "escalation": escalation,
                "helpline": helpline,
            },
            "disclaimer": "AI-generated legal guidance. Not a substitute for a licensed lawyer.",
        }
    
    @classmethod
    def process_complaint(cls, user_input: str) -> dict:
        """
        Process user complaint and return comprehensive legal guidance.
        
        Args:
            user_input (str): User's complaint or problem description
            
        Returns:
            dict: Categorized response with legal guidance
        """
        if not user_input or not user_input.strip():
            return {
                "success": False,
                "error": "Please describe your issue clearly.",
                "category": None,
                "response": None
            }
        
        try:
            ai_result = cls._ai_process_complaint(user_input)
            if ai_result:
                return ai_result

            allow_keyword_fallback = os.getenv("ALLOW_KEYWORD_FALLBACK", "false").lower() == "true"
            if not allow_keyword_fallback:
                return {
                    "success": False,
                    "error": "AI legal guidance unavailable. Check GROQ/OPENAI/OPENROUTER configuration.",
                    "category": None,
                    "response": None,
                }

            category = cls.detect_category(user_input)
            response_data = cls.generate_response(category)
            
            return {
                "success": True,
                "error": None,
                "category": category,
                "response": {
                    "section": response_data["section"],
                    "advice": response_data["advice"],
                    "escalation": response_data["escalation"],
                    "helpline": response_data["helpline"]
                },
                "disclaimer": "Keyword fallback response shown because AI provider response was unavailable."
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error processing complaint: {str(e)}",
                "category": None,
                "response": None
            }

    @classmethod
    def chat_with_gpt(cls, messages: list[dict], model: str = "gpt-3.5-turbo") -> dict:
        """
        Send a conversation to AI and return the assistant reply.
        Provider priority: GROQ -> OPENAI -> OPENROUTER.
        Returns explicit errors instead of silent mock/default replies.
        """
        if not messages:
            return {"success": False, "error": "No messages provided.", "reply": None}

        provider_errors: list[str] = []
        preferred_provider = (os.getenv("AI_PROVIDER") or "groq").strip().lower()
        provider_allows = {
            "groq": {"groq"},
            "openai": {"openai"},
            "openrouter": {"openrouter"},
            "auto": {"groq", "openai", "openrouter"},
        }
        enabled = provider_allows.get(preferred_provider, {"groq"})

        # Try Groq first
        groq_key = (os.getenv("GROQ_API_KEY") or "").strip()
        if "groq" in enabled and groq_key and Groq is not None:
            try:
                client = Groq(api_key=groq_key)
                groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
                resp = client.chat.completions.create(
                    model=groq_model,
                    messages=messages,
                    max_tokens=1024
                )
                text = resp.choices[0].message.content.strip()
                return {"success": True, "reply": text, "error": None}
            except Exception as e:
                provider_errors.append(f"GROQ failed: {str(e)}")
        
        # Try OpenAI
        openai_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        if "openai" in enabled and openai_key:
            try:
                client = OpenAI(api_key=openai_key)
                resp = client.chat.completions.create(model=model, messages=messages)
                text = resp.choices[0].message.content.strip()
                return {"success": True, "reply": text, "error": None}
            except Exception as e:
                provider_errors.append(f"OPENAI failed: {str(e)}")

        # Try OpenRouter
        openrouter_key = (os.getenv("OPENROUTER_API_KEY") or "").strip()
        if "openrouter" in enabled and openrouter_key:
            attempted_models: list[str] = []
            try:
                configured_model = (os.getenv("OPENROUTER_MODEL") or "").strip()
                model_candidates = [
                    configured_model,
                    "openai/gpt-4o-mini",
                    "meta-llama/llama-3.1-8b-instruct",
                    "google/gemini-2.0-flash-001",
                ]
                model_candidates = [m for m in model_candidates if m]
                client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=openrouter_key,
                )
                for openrouter_model in model_candidates:
                    attempted_models.append(openrouter_model)
                    try:
                        resp = client.chat.completions.create(
                            model=openrouter_model,
                            messages=messages,
                        )
                        text = resp.choices[0].message.content.strip()
                        return {"success": True, "reply": text, "error": None}
                    except Exception:
                        continue
                provider_errors.append(
                    "OPENROUTER failed for models: " + ", ".join(attempted_models)
                )
            except Exception as e:
                provider_errors.append(f"OPENROUTER failed: {str(e)}")

        if not provider_errors:
            return {
                "success": False,
                "reply": None,
                "error": f"No AI provider configured for AI_PROVIDER={preferred_provider}.",
            }

        return {
            "success": False,
            "reply": None,
            "error": " | ".join(provider_errors),
        }
    
    @staticmethod
    def _get_mock_response(messages: list[dict]) -> dict:
        """Generate mock responses for testing without API key"""
        if not messages:
            return {"success": True, "reply": "Hello! How can I help you?", "error": None}
        
        last_message = messages[-1].get("content", "").lower()
        
        # Conversational responses
        if any(word in last_message for word in ["how are you", "how're you", "how do you do", "how you doing"]):
            return {"success": True, "reply": "I'm doing great, thank you for asking! I'm Justice AI, your legal guidance assistant for Indian law. I'm here to help answer questions about legal matters, complaints, and rights. How can I assist you today?", "error": None}
        
        if any(word in last_message for word in ["what is your name", "who are you", "what are you", "introduce yourself"]):
            return {"success": True, "reply": "I'm Justice AI, an intelligent legal guidance chatbot designed to help people understand their rights and legal remedies under Indian law. I can provide guidance on various legal issues including cyber fraud, harassment, domestic violence, theft, and general legal concerns.", "error": None}
        
        if any(word in last_message for word in ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"]):
            return {"success": True, "reply": "Hello! Welcome to Justice AI. I'm here to help you with legal guidance for Indian law. You can ask me about complaint categorization, legal rights, or specific legal concerns. What would you like to know?", "error": None}
        
        if any(word in last_message for word in ["thank", "thanks", "thankyou", "appreciate"]):
            return {"success": True, "reply": "You're welcome! I'm happy to help. Feel free to ask me any legal questions or concerns you have.", "error": None}
        
        if any(word in last_message for word in ["bye", "goodbye", "see you", "take care", "farewell"]):
            return {"success": True, "reply": "Goodbye! Remember, if you need legal help, don't hesitate to contact a lawyer or visit your nearest police station. Stay safe!", "error": None}
        
        # Filing a case / case filing steps - CHECK BEFORE GENERAL LEGAL RESPONSES
        if any(word in last_message for word in ["file case", "filing case", "how to file", "file complaint", "file fir", "file petition", "steps to file", "case filing", "file suit", "what process", "process i do"]):
            # Specific response for fraud + filing
            if any(word in last_message for word in ["fraud", "scam", "cyber", "online"]):
                return {"success": True, "reply": "Steps to File a Cyber Fraud Case from Justice AI Website:\n\n1. **Describe Your Fraud Issue** - Go to Justice AI website (http://localhost:8080) and select 'Legal Guidance' mode\n2. **Enter Complaint Details** - Type details about the online fraud/scam you experienced\n3. **Get Categorization** - The system will identify it as 'Cyber Fraud'\n4. **Receive Legal Guidance** - You'll get:\n   - Relevant IPC sections (IT Act 66C, IPC 420)\n   - Legal advice on evidence preservation\n   - Steps to escalate the case\n   - Helpline numbers\n5. **File FIR at Cyber Cell** - Visit nearest police station or Cyber Crime Cell with the guidance\n6. **Report Online** - Also report at National Cyber Crime Portal: www.cybercrime.gov.in\n7. **Call Helpline** - Contact 1930 (Cyber Crime Helpline) for immediate assistance\n\nJustice AI guides you; actual FIR filing is done at police station.", "error": None}
            else:
                return {"success": True, "reply": "Steps to File a Case in Justice AI:\n\n1. **Describe Your Issue** - Use our website to describe your legal complaint or concern\n2. **Get Category** - Our system will categorize your issue (Cyber Fraud, Harassment, Domestic Violence, Theft, etc.)\n3. **Receive Guidance** - Get relevant IPC sections and legal advice for your specific situation\n4. **Take Action** - Follow the recommended steps:\n   - File FIR at nearest police station\n   - Contact relevant helplines (100, 1091, 181, 1930)\n   - Approach magistrate if needed\n   - Gather evidence and documentation\n5. **Seek Legal Help** - Consult a lawyer for detailed legal representation\n\nWhat type of case would you like help with?", "error": None}
        
        # Legal-specific responses
        if any(word in last_message for word in ["scam", "fraud", "online", "cyber"]):
            return {"success": True, "reply": "I can help with cybercrime and online fraud cases. You can file an FIR at your nearest police station or report to the Cyber Crime Cell. In India, you can also contact the National Cyber Crime Reporting Portal at www.cybercrime.gov.in. Would you like more information?", "error": None}
        
        if any(word in last_message for word in ["harassment", "abuse", "threat"]):
            return {"success": True, "reply": "Harassment and threats are serious matters. You have the right to file a complaint under IPC sections 294 (obscene acts/words), 504 (intentional insult), 506 (criminal intimidation), and 509 (insulting modesty). Please contact your local police station to file an FIR.", "error": None}
        
        if any(word in last_message for word in ["theft", "stolen", "robbery", "burglary"]):
            return {"success": True, "reply": "For theft and robbery cases, you should file an FIR (First Information Report) at your nearest police station immediately. Provide all details and evidence. You can also file a complaint online through your state's police portal.", "error": None}
        
        if any(word in last_message for word in ["domestic", "violence", "abuse", "family", "husband", "wife", "spouse", "torture", "torturing", "beating", "hitting", "cruelty"]):
            return {"success": True, "reply": "Domestic violence is a serious crime. You can file a case under IPC sections 498A (cruelty by husband/in-laws) and 304B (dowry death). Contact the National Domestic Violence Hotline: 181 (toll-free). Women can also approach a magistrate for protection orders. Here are the steps:\n\n10. **Contact the nearest police station** and file an FIR under IPC 498A or other applicable sections.\n11. **Approach the Magistrate** for an order under the Protection of Women from Domestic Violence Act for immediate relief and protection.\n12. **Call 181 (Women Helpline)** for immediate assistance, counseling, and to know your rights and options available.", "error": None}
        
        if any(word in last_message for word in ["fir", "first information report", "complaint", "police"]):
            return {"success": True, "reply": "An FIR (First Information Report) is the first step in criminal proceedings. You can file it at your nearest police station for any crime. You have the right to file an FIR for any offense. Once filed, the police will investigate and proceed accordingly. It's free to file an FIR.", "error": None}
        
        if any(word in last_message for word in ["rights", "my rights", "citizen rights", "legal rights"]):
            return {"success": True, "reply": "As an Indian citizen, you have several rights: the right to file a complaint/FIR for any crime, the right to seek legal counsel, the right to a fair trial, the right to compensation for damages, and the right to appeal court decisions. Different situations have different protections under Indian law.", "error": None}
        
        if any(word in last_message for word in ["law", "ipc", "legal", "section", "act"]):
            return {"success": True, "reply": "I can provide guidance on Indian Penal Code (IPC) sections and various acts. The IPC covers criminal offenses like theft, fraud, harassment, violence, etc. There are also specific acts like the Cyber Crime Act, Domestic Violence Act, etc. What specific legal topic would you like to know about?", "error": None}
        
        # Website login and usage
        if any(word in last_message for word in ["login", "sign up", "signup", "register", "account", "create account", "password", "username"]):
            return {"success": True, "reply": "To use Justice AI:\n\n1. **Access the Website** - Open Justice AI in your web browser at http://localhost:8080 (or your server address)\n2. **No Login Required** - Justice AI is free and accessible without creating an account\n3. **Choose Mode** - Select either 'Legal Guidance' or 'General Chat' mode from the interface\n4. **Ask Your Question** - Type your legal question or complaint description in the message box\n5. **Get Guidance** - Receive instant legal advice, relevant IPC sections, and action steps\n\nYou can access all features immediately without registration!", "error": None}
        
        # Website features
        if any(word in last_message for word in ["website", "features", "how to use", "website features", "what can i do", "features of justice ai", "how does it work"]):
            return {"success": True, "reply": "Justice AI Website Features:\n\n1. **Legal Guidance Mode** - Describe your legal issue and receive categorized advice with:\n   - Relevant IPC sections\n   - Practical legal advice\n   - Escalation procedures\n   - Emergency helpline numbers\n\n2. **General Chat Mode** - Ask any legal or general questions and get instant responses\n\n3. **Complaint Categories** - Handles:\n   - Cyber Fraud\n   - Harassment\n   - Domestic Violence\n   - Theft\n   - General Legal Issues\n\n4. **24/7 Availability** - Access anytime, anywhere\n\n5. **Free Service** - No charges or registration required\n\nJust type your question or complaint to get started!", "error": None}
        
        # Default conversational response
        return {"success": True, "reply": "That's an interesting question! I'm Justice AI, and my expertise is in providing legal guidance for Indian law. If you have any legal questions or concerns, I'd be happy to help. Otherwise, feel free to ask me about how to report a crime, your legal rights, or specific legal issues.", "error": None}
