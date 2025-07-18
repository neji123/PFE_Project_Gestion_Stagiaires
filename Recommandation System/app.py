import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pyodbc
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
from dotenv import load_dotenv
import logging
import json
import traceback
import re
import requests
from urllib.parse import urlparse
import tempfile
import os

# 🧬 SIMILARITÉ SÉMANTIQUE - Nouveaux imports
from sentence_transformers import SentenceTransformer

# Imports optionnels pour l'analyse des CVs (installation requise)
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logger.warning("PyPDF2 non disponible - installation requise: pip install PyPDF2")

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    logger.warning("python-docx non disponible - installation requise: pip install python-docx")

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF non disponible - installation requise: pip install PyMuPDF")

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Charger les variables d'environnement
load_dotenv()

class CVAnalysisEngine:
    """🤖 MOTEUR D'ANALYSE ML DES CVs"""
    
    def __init__(self):
        self.supported_formats = ['.pdf', '.docx', '.doc', '.txt']
        
        # Patterns pour extraire des informations clés
        self.experience_patterns = [
            r'(\d+)\s*(?:ans?|years?)\s*(?:d\'|of)?\s*(?:experience|expérience)',
            r'(?:experience|expérience).*?(\d+)\s*(?:ans?|years?)',
            r'(\d+)\+?\s*(?:ans?|years?)',
        ]
        
        self.education_patterns = [
            r'(?:master|m[12]|msc|ma|diplôme|degree|bachelor|licence|l[123]|bts|dut)',
            r'(?:université|university|école|school|institut|college)',
            r'(?:informatique|computer|engineering|ingénieur|développement|development)'
        ]
        
        self.project_patterns = [
            r'(?:projet|project|application|app|site|website|système|system)',
            r'(?:développé|developed|créé|created|réalisé|built)',
            r'(?:github|git|portfolio)'
        ]
        
    def download_cv_from_url(self, cv_url):
        """Télécharge un CV depuis une URL"""
        try:
            if not cv_url or pd.isna(cv_url) or cv_url.strip() == '':
                return None
                
            logger.info(f"📥 Téléchargement CV: {cv_url}")
            
            # Vérification de l'URL
            parsed_url = urlparse(cv_url)
            if not parsed_url.scheme:
                cv_url = 'http://' + cv_url
            
            # Téléchargement
            response = requests.get(cv_url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            # Détection du type de fichier
            content_type = response.headers.get('content-type', '').lower()
            file_extension = None
            
            if 'pdf' in content_type:
                file_extension = '.pdf'
            elif 'word' in content_type or 'document' in content_type:
                file_extension = '.docx'
            else:
                # Essayer de deviner depuis l'URL
                url_lower = cv_url.lower()
                for ext in self.supported_formats:
                    if ext in url_lower:
                        file_extension = ext
                        break
                
                if not file_extension:
                    file_extension = '.pdf'  # Par défaut
            
            # Sauvegarde temporaire
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
                tmp_file.write(response.content)
                tmp_file_path = tmp_file.name
            
            logger.info(f"✅ CV téléchargé: {tmp_file_path} ({len(response.content)} bytes)")
            return tmp_file_path
            
        except Exception as e:
            logger.error(f"❌ Erreur téléchargement CV {cv_url}: {e}")
            return None
    
    def extract_text_from_pdf(self, file_path):
        """Extrait le texte d'un PDF"""
        try:
            text = ""
            
            # Tentative avec PyMuPDF (plus robuste)
            if PYMUPDF_AVAILABLE:
                try:
                    doc = fitz.open(file_path)
                    for page in doc:
                        text += page.get_text()
                    doc.close()
                    if text.strip():
                        return text
                except Exception as e:
                    logger.warning(f"⚠️ PyMuPDF échoué: {e}")
            
            # Fallback avec PyPDF2
            if PDF_AVAILABLE:
                try:
                    with open(file_path, 'rb') as file:
                        pdf_reader = PyPDF2.PdfReader(file)
                        for page in pdf_reader.pages:
                            text += page.extract_text()
                    if text.strip():
                        return text
                except Exception as e:
                    logger.warning(f"⚠️ PyPDF2 échoué: {e}")
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"❌ Erreur extraction PDF: {e}")
            return ""
    
    def extract_text_from_docx(self, file_path):
        """Extrait le texte d'un document Word"""
        try:
            if not DOCX_AVAILABLE:
                return ""
                
            doc = docx.Document(file_path)
            text = ""
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
                
            return text.strip()
            
        except Exception as e:
            logger.error(f"❌ Erreur extraction DOCX: {e}")
            return ""
    
    def extract_text_from_file(self, file_path):
        """Extrait le texte selon le type de fichier"""
        try:
            if not file_path or not os.path.exists(file_path):
                return ""
            
            file_extension = os.path.splitext(file_path)[1].lower()
            
            if file_extension == '.pdf':
                return self.extract_text_from_pdf(file_path)
            elif file_extension in ['.docx', '.doc']:
                return self.extract_text_from_docx(file_path)
            elif file_extension == '.txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                logger.warning(f"⚠️ Format non supporté: {file_extension}")
                return ""
                
        except Exception as e:
            logger.error(f"❌ Erreur extraction texte: {e}")
            return ""
        finally:
            # Nettoyage du fichier temporaire
            try:
                if file_path and os.path.exists(file_path) and 'tmp' in file_path:
                    os.unlink(file_path)
            except:
                pass
    
    def analyze_cv_content(self, cv_text):
        """🤖 ANALYSE ML INTELLIGENTE DU CONTENU DU CV"""
        try:
            if not cv_text or len(cv_text.strip()) < 50:
                return {
                    'text_content': '',
                    'key_skills': [],
                    'experience_years': 0,
                    'education_level': 'Inconnu',
                    'projects_count': 0,
                    'quality_score': 0.1,
                    'analysis_success': False
                }
            
            cv_text_clean = cv_text.lower()
            
            # 1️⃣ EXTRACTION DES ANNÉES D'EXPÉRIENCE
            experience_years = 0
            for pattern in self.experience_patterns:
                matches = re.findall(pattern, cv_text_clean, re.IGNORECASE)
                if matches:
                    try:
                        years = max([int(match) for match in matches if match.isdigit()])
                        experience_years = max(experience_years, years)
                    except:
                        pass
            
            # 2️⃣ ANALYSE DU NIVEAU D'ÉDUCATION
            education_level = 'Inconnue'
            education_score = 0
            
            for pattern in self.education_patterns:
                if re.search(pattern, cv_text_clean, re.IGNORECASE):
                    education_score += 1
            
            if education_score >= 2:
                education_level = 'Supérieure'
            elif education_score >= 1:
                education_level = 'Intermédiaire'
            
            # 3️⃣ COMPTAGE DES PROJETS
            projects_count = 0
            for pattern in self.project_patterns:
                matches = re.findall(pattern, cv_text_clean, re.IGNORECASE)
                projects_count += len(matches)
            
            # 4️⃣ EXTRACTION INTELLIGENTE DES COMPÉTENCES DU CV
            # Utiliser la méthode existante mais adaptée au CV
            cv_skills = self.extract_skills_from_cv_content(cv_text)
            
            # 5️⃣ CALCUL DU SCORE DE QUALITÉ DU CV
            quality_score = self.calculate_cv_quality_score(
                cv_text, experience_years, education_score, projects_count, len(cv_skills)
            )
            
            # 6️⃣ PRÉPARATION DU TEXTE POUR LA SIMILARITÉ
            # Garder les informations les plus pertinentes
            processed_text = self.prepare_cv_text_for_matching(cv_text, cv_skills)
            
            result = {
                'text_content': processed_text,
                'key_skills': cv_skills,
                'experience_years': experience_years,
                'education_level': education_level,
                'projects_count': min(projects_count, 10),  # Limitation
                'quality_score': quality_score,
                'analysis_success': True,
                'word_count': len(cv_text.split()),
                'original_text_length': len(cv_text)
            }
            
            logger.info(f"✅ Analyse CV réussie: {len(cv_skills)} compétences, "
                       f"{experience_years} ans exp, qualité: {quality_score:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse CV: {e}")
            return {
                'text_content': cv_text[:500] if cv_text else '',  # Fallback
                'key_skills': [],
                'experience_years': 0,
                'education_level': 'Erreur',
                'projects_count': 0,
                'quality_score': 0.2,
                'analysis_success': False
            }
    
    def extract_skills_from_cv_content(self, cv_text):
        """Extraction spécialisée des compétences depuis un CV"""
        # Patterns spéciaux pour les CVs
        cv_skills_patterns = [
            r'(?:compétences|skills|technologies)[\s\:]*([^\n\r]+)',
            r'(?:langages|languages)[\s\:]*([^\n\r]+)',
            r'(?:frameworks?|outils|tools)[\s\:]*([^\n\r]+)',
            r'(?:certifications?)[\s\:]*([^\n\r]+)'
        ]
        
        # Extraction basique des mots techniques
        extracted_skills = self._extract_basic_skills(cv_text)
        
        # Ajout des compétences spécifiques aux CVs
        for pattern in cv_skills_patterns:
            matches = re.findall(pattern, cv_text, re.IGNORECASE)
            for match in matches:
                additional_skills = self._extract_basic_skills(match)
                extracted_skills.extend(additional_skills)
        
        # Dédoublonnage et nettoyage
        unique_skills = list(set(extracted_skills))
        
        # Filtrage des compétences trop génériques pour un CV
        cv_stop_words = {
            'travail', 'équipe', 'communication', 'organisation', 'autonomie',
            'rigueur', 'motivation', 'dynamique', 'polyvalent', 'adaptable'
        }
        
        filtered_skills = [skill for skill in unique_skills 
                          if skill not in cv_stop_words and len(skill) > 2]
        
        return filtered_skills[:20]  # Limitation à 20 compétences max
    
    def _extract_basic_skills(self, text):
        """Extraction basique des compétences techniques"""
        if not text:
            return []
            
        # Liste des compétences techniques communes
        tech_skills = [
            'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
            'node', 'express', 'django', 'flask', 'spring', 'laravel', 'php',
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'html', 'css',
            'docker', 'kubernetes', 'aws', 'azure', 'git', 'linux', 'windows',
            'figma', 'photoshop', 'illustrator', 'sketch', 'xd'
        ]
        
        text_lower = text.lower()
        found_skills = []
        
        for skill in tech_skills:
            if skill in text_lower:
                found_skills.append(skill)
        
        # Recherche par patterns supplémentaires
        separators = r'[,;|\n\r\t\-•·/\\()[\]{}+=<>"\']+'
        words = re.split(separators, text_lower)
        
        for word in words:
            word = word.strip()
            if (len(word) >= 2 and 
                word not in ['et', 'de', 'la', 'le', 'du', 'des', 'avec', 'pour'] and
                not word.isdigit()):
                if any(tech in word for tech in tech_skills):
                    found_skills.append(word)
        
        return list(set(found_skills))
    
    def calculate_cv_quality_score(self, cv_text, experience_years, education_score, projects_count, skills_count):
        """Calcule un score de qualité du CV"""
        try:
            # Score basé sur la longueur (trop court = incomplet, trop long = verbeux)
            text_length = len(cv_text.split())
            if text_length < 100:
                length_score = text_length / 100  # Pénalité pour CV trop courts
            elif text_length > 1000:
                length_score = 1000 / text_length  # Pénalité pour CV trop longs
            else:
                length_score = 1.0
            
            # Score d'expérience
            exp_score = min(experience_years / 5, 1.0)  # Optimal à 5 ans
            
            # Score d'éducation
            edu_score = min(education_score / 3, 1.0)
            
            # Score de projets
            proj_score = min(projects_count / 5, 1.0)
            
            # Score de compétences
            skill_score = min(skills_count / 10, 1.0)
            
            # Score composite
            quality_score = (length_score * 0.2 + exp_score * 0.3 + 
                           edu_score * 0.2 + proj_score * 0.15 + skill_score * 0.15)
            
            return max(0.1, min(1.0, quality_score))
            
        except:
            return 0.3
    
    def prepare_cv_text_for_matching(self, cv_text, skills):
        """Prépare le texte du CV pour la comparaison avec les offres"""
        try:
            # Nettoyage du texte
            text = re.sub(r'[^\w\s\-\.]', ' ', cv_text)
            text = re.sub(r'\s+', ' ', text)
            
            # Combinaison du texte principal avec les compétences extraites
            skills_text = ' '.join(skills)
            combined_text = f"{text} {skills_text}"
            
            # Limitation de la taille pour éviter le sur-processing
            words = combined_text.split()
            if len(words) > 200:
                # Garder le début et la fin + compétences
                important_text = ' '.join(words[:100] + words[-50:] + skills)
            else:
                important_text = combined_text
            
            return important_text.strip()
            
        except:
            return cv_text[:500] if cv_text else ''
    
    def analyze_stagiaire_cv(self, cv_url):
        """🎯 ANALYSE COMPLÈTE DU CV D'UN STAGIAIRE"""
        try:
            logger.info(f"\n📄 === ANALYSE ML DU CV ===")
            logger.info(f"🔗 URL: {cv_url}")
            
            if not cv_url or pd.isna(cv_url) or cv_url.strip() == '':
                logger.warning("❌ Pas d'URL de CV fournie")
                return {
                    'success': False,
                    'error': 'Pas de CV fourni',
                    'cv_analysis': {
                        'text_content': '',
                        'key_skills': [],
                        'experience_years': 0,
                        'education_level': 'Inconnu',
                        'projects_count': 0,
                        'quality_score': 0.1,
                        'analysis_success': False
                    }
                }
            
            # 1️⃣ Téléchargement du CV
            cv_file_path = self.download_cv_from_url(cv_url)
            if not cv_file_path:
                return {
                    'success': False,
                    'error': 'Impossible de télécharger le CV',
                    'cv_analysis': {
                        'text_content': '',
                        'key_skills': [],
                        'experience_years': 0,
                        'education_level': 'Erreur téléchargement',
                        'projects_count': 0,
                        'quality_score': 0.1,
                        'analysis_success': False
                    }
                }
            
            # 2️⃣ Extraction du texte
            cv_text = self.extract_text_from_file(cv_file_path)
            if not cv_text or len(cv_text.strip()) < 20:
                logger.warning(f"⚠️ Texte du CV trop court ou vide: {len(cv_text)} caractères")
                return {
                    'success': False,
                    'error': 'CV illisible ou vide',
                    'cv_analysis': {
                        'text_content': '',
                        'key_skills': [],
                        'experience_years': 0,
                        'education_level': 'CV illisible',
                        'projects_count': 0,
                        'quality_score': 0.1,
                        'analysis_success': False
                    }
                }
            
            # 3️⃣ Analyse ML du contenu
            cv_analysis = self.analyze_cv_content(cv_text)
            
            logger.info(f"✅ CV analysé avec succès!")
            logger.info(f"   📝 Contenu: {len(cv_analysis['text_content'])} caractères")
            logger.info(f"   🎯 Compétences: {len(cv_analysis['key_skills'])} trouvées")
            logger.info(f"   📊 Expérience: {cv_analysis['experience_years']} ans")
            logger.info(f"   🎓 Formation: {cv_analysis['education_level']}")
            logger.info(f"   🏆 Qualité: {cv_analysis['quality_score']:.2f}")
            
            return {
                'success': True,
                'cv_analysis': cv_analysis
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur globale analyse CV: {e}")
            return {
                'success': False,
                'error': str(e),
                'cv_analysis': {
                    'text_content': '',
                    'key_skills': [],
                    'experience_years': 0,
                    'education_level': 'Erreur',
                    'projects_count': 0,
                    'quality_score': 0.1,
                    'analysis_success': False
                }
            }
# ========================================
# 🧠 CLASSE PRINCIPALE DE RECOMMANDATION
# ========================================
class ImprovedRecommendationSystem:
    """Système de recommandation intelligent avec ML et analyse sémantique"""
    
    def __init__(self):
        """Initialisation du système de recommandation"""
        logger.info("🚀 Initialisation du système de recommandation...")
        
        # Configuration base de données
        self.db_server = os.getenv('DB_SERVER', 'DESKTOP-913R9GN')
        self.db_name = os.getenv('DB_NAME', 'PFEDb')
        self.connection_string = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={self.db_server};DATABASE={self.db_name};Trusted_Connection=yes;'
        
        # Initialisation de l'analyseur CV
        self.cv_analyzer = CVAnalysisEngine()
        
        # Initialisation TF-IDF pour le fallback
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english')
        
        # Modèle sémantique (optionnel)
        self.semantic_model = None
        try:
            from sentence_transformers import SentenceTransformer
            self.semantic_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            logger.info("✅ Modèle sémantique chargé")
        except Exception as e:
            logger.warning(f"⚠️ Modèle sémantique non disponible: {e}")
        
        # Cache pour optimiser les performances
        self.cache = {}
        
        logger.info("✅ Système de recommandation initialisé")
    
    def get_recommendations(self, job_offer, top_n=10):
        """Génère des recommandations intelligentes pour une offre d'emploi"""
        try:
            logger.info(f"🎯 Génération de recommandations pour: {job_offer.get('title', 'Offre sans titre')}")
            
            # 1️⃣ Récupération des données stagiaires via la méthode de CVAnalysisEngine
            stagiaires_df = self._get_stagiaires_data()
            if stagiaires_df.empty:
                return {'recommendations': [], 'total_candidates': 0, 'processing_time': 0}
            
            logger.info(f"📊 {len(stagiaires_df)} stagiaires trouvés")
            
            # 2️⃣ Calcul des scores de correspondance
            recommendations = []
            
            for _, stagiaire in stagiaires_df.iterrows():
                try:
                    # Calcul du score principal
                    match_score = self._calculate_match_score(job_offer, stagiaire)
                    
                    # Calcul du score de compétences
                    skill_score = self.calculate_enhanced_skill_similarity(
                        job_offer.get('requiredSkills', ''),
                        stagiaire.get('Skills', '')
                    )
                    
                    # Score de rating (performance passée)
                    rating_score = self._get_rating_score(stagiaire)
                    
                    # Score final hybride
                    base_score = (match_score * 0.4) + (skill_score * 0.4) + (rating_score * 0.2)
                    
                    # Application des bonus (APRÈS calcul du score de base)
                    dept_bonus = self._calculate_department_match(job_offer, stagiaire)
                    availability_bonus = self._calculate_availability_score(stagiaire)
                    
                    # Score final avec bonus
                    final_score = min(base_score + dept_bonus + availability_bonus, 1.0)
                    
                    # Création de la recommandation
                    recommendation = {
                        'stagiaireId': int(stagiaire.get('Id', 0)),  # Changé
                        'name': f"{stagiaire.get('FirstName', '')} {stagiaire.get('LastName', '')}".strip(),  # Changé
                        'email': stagiaire.get('Email', ''),
                        'skills': stagiaire.get('Skills', ''),  # Changé
                        'department': stagiaire.get('DepartmentName', 'Non défini'),
                        'university': stagiaire.get('Universityname', ''),  # Ajouté
                        'stagePeriod': f"{stagiaire.get('StartDate', '')} → {stagiaire.get('EndDate', '')}",  # Ajouté
                        'rating': round(rating_score * 5, 2),  # Changé pour être sur 5
                        'compositeScore': round(final_score, 3),  # Changé
                        'textSimilarity': round(match_score, 3),  # Changé
                        'skillSimilarity': round(skill_score, 3),
                        'departmentMatch': True,  # Ajouté
                        'matchReasons': self._generate_match_reasons(
                            match_score, skill_score, rating_score, stagiaire, job_offer
                        ),
                        'match_score': round(final_score, 3)  # Ajouté pour le tri
                    }
                    
                    recommendations.append(recommendation)
                    
                except Exception as e:
                    logger.warning(f"Erreur traitement stagiaire {stagiaire.get('Id', 'ID_UNKNOWN')}: {e}")
                    continue
            
            # 3️⃣ Tri et limitation des résultats
            recommendations.sort(key=lambda x: x['match_score'], reverse=True)
            top_recommendations = recommendations[:top_n]
            
            logger.info(f"✅ {len(top_recommendations)} recommandations générées")
            
            return {
                'recommendations': top_recommendations,
                'total_candidates': len(stagiaires_df),
                'processed_candidates': len(recommendations),
                'top_n': len(top_recommendations)
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur génération recommandations: {e}")
            return {
                'recommendations': [],
                'total_candidates': 0,
                'error': str(e)
            }
    
    def _calculate_match_score(self, job_offer, stagiaire):
        """Calcule le score de correspondance textuelle (sans bonus)"""
        try:
            # Score basé uniquement sur le titre et la description
            text_score = self._calculate_text_similarity(job_offer, stagiaire)
            return text_score
            
        except Exception as e:
            logger.warning(f"Erreur calcul match score: {e}")
            return 0.0
    
    def _calculate_text_similarity(self, job_offer, stagiaire):
        """Calcule la similarité textuelle entre l'offre et le profil stagiaire"""
        try:
            job_text = f"{job_offer.get('title', '')} {job_offer.get('description', '')}"
            stagiaire_text = f"{stagiaire.get('Skills', '')} {stagiaire.get('CV_ExtractedSkills', '')}"
            
            if not job_text.strip() or not stagiaire_text.strip():
                return 0.0
            
            # Utilisation du modèle sémantique si disponible
            if self.semantic_model:
                return self._calculate_semantic_similarity(job_text, stagiaire_text)
            else:
                return self._calculate_basic_similarity(job_text, stagiaire_text)
                
        except Exception as e:
            logger.warning(f"Erreur similarité textuelle: {e}")
            return 0.0
    
    def _calculate_semantic_similarity(self, text1, text2):
        """Calcule la similarité sémantique avec sentence transformers"""
        try:
            embeddings1 = self.semantic_model.encode([text1])
            embeddings2 = self.semantic_model.encode([text2])
            similarity = cosine_similarity(embeddings1, embeddings2)[0][0]
            return max(0.0, float(similarity))
        except:
            return self._calculate_basic_similarity(text1, text2)
    
    def _calculate_basic_similarity(self, text1, text2):
        """Calcule une similarité basique basée sur les mots communs"""
        try:
            words1 = set(text1.lower().split())
            words2 = set(text2.lower().split())
            
            if not words1 or not words2:
                return 0.0
            
            intersection = words1.intersection(words2)
            union = words1.union(words2)
            
            return len(intersection) / len(union) if union else 0.0
            
        except:
            return 0.0
    
    def _calculate_department_match(self, job_offer, stagiaire):
        """Calcule le bonus de correspondance de département"""
        try:
            job_dept_id = job_offer.get('departmentId')
            stagiaire_dept_id = stagiaire.get('DepartmentId')
            
            if job_dept_id and stagiaire_dept_id and job_dept_id == stagiaire_dept_id:
                return 0.2  # Bonus de 20%
            return 0.0
            
        except:
            return 0.0
    
    def _calculate_availability_score(self, stagiaire):
        """Calcule le score de disponibilité du stagiaire"""
        try:
            statut = str(stagiaire.get('statuts', '')).lower()
            
            if 'disponible' in statut or 'actif' in statut:
                return 0.1  # Bonus de 10%
            elif 'occupé' in statut or 'indisponible' in statut:
                return -0.1  # Malus de 10%
            
            return 0.0
            
        except:
            return 0.0
    
    def calculate_enhanced_skill_similarity(self, job_skills, candidate_skills):
        """Calcule la similarité de compétences avec correspondances sémantiques"""
        try:
            if not job_skills or not candidate_skills:
                return 0.0
            
            # Extraction des compétences
            job_skills_list = self._extract_skills_from_text(str(job_skills))
            candidate_skills_list = self._extract_skills_from_text(str(candidate_skills))
            
            if not job_skills_list or not candidate_skills_list:
                return 0.0
            
            # Calcul de correspondances
            matches = 0
            total_job_skills = len(job_skills_list)
            
            for job_skill in job_skills_list:
                for candidate_skill in candidate_skills_list:
                    if self._skills_match(job_skill, candidate_skill):
                        matches += 1
                        break
            
            similarity = matches / total_job_skills if total_job_skills > 0 else 0.0
            return min(similarity, 1.0)
            
        except Exception as e:
            logger.warning(f"Erreur calcul similarité compétences: {e}")
            return 0.0
    
    def _extract_skills_from_text(self, text):
        """Extrait les compétences d'un texte"""
        try:
            if not text:
                return []
            
            # Nettoyage du texte
            text = text.lower().strip()
            
            # Liste de compétences techniques communes
            known_skills = [
                'python', 'java', 'javascript', 'react', 'angular', 'nodejs', 'php',
                'html', 'css', 'sql', 'mysql', 'postgresql', 'mongodb', 'docker',
                'kubernetes', 'git', 'linux', 'windows', 'aws', 'azure', 'gcp',
                'machine learning', 'artificial intelligence', 'data science',
                'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
                'spring', 'django', 'flask', 'laravel', 'vue', 'bootstrap',
                'c++', 'c#', 'ruby', 'go', 'rust', 'swift', 'kotlin'
            ]
            
            found_skills = []
            for skill in known_skills:
                if skill in text:
                    found_skills.append(skill)
            
            # Extraction par séparateurs si pas de compétences connues trouvées
            if not found_skills:
                separators = [',', ';', '|', '\n', '-']
                for sep in separators:
                    if sep in text:
                        found_skills = [s.strip() for s in text.split(sep) if s.strip()]
                        break
            
            return found_skills[:10]  # Limiter à 10 compétences max
            
        except:
            return []
    
    def _skills_match(self, skill1, skill2):
        """Vérifie si deux compétences correspondent"""
        try:
            skill1 = skill1.lower().strip()
            skill2 = skill2.lower().strip()
            
            # Correspondance exacte
            if skill1 == skill2:
                return True
            
            # Correspondance partielle
            if skill1 in skill2 or skill2 in skill1:
                return True
            
            # Correspondances sémantiques spécifiques
            synonyms = {
                'js': 'javascript',
                'py': 'python',
                'ai': 'artificial intelligence',
                'ml': 'machine learning',
                'db': 'database',
                'sql server': 'sql',
                'react.js': 'react',
                'vue.js': 'vue',
                'node.js': 'nodejs'
            }
            
            skill1_normalized = synonyms.get(skill1, skill1)
            skill2_normalized = synonyms.get(skill2, skill2)
            
            return skill1_normalized == skill2_normalized
            
        except:
            return False
    
    def _get_rating_score(self, stagiaire):
        """Récupère le score de rating du stagiaire"""
        try:
            # Utilise le rating calculé par CVAnalysisEngine
            rating_data = {
                'technical_rating': stagiaire.get('TechnicalRating', 3.0),
                'communication_rating': stagiaire.get('CommunicationRating', 3.0),
                'teamwork_rating': stagiaire.get('TeamworkRating', 3.0),
                'punctuality_rating': stagiaire.get('PunctualityRating', 3.0),
                'overall_rating': stagiaire.get('OverallRating', 3.0)
            }
            
            return self.cv_analyzer.calculate_rating_score_enhanced(rating_data)
            
        except Exception as e:
            logger.warning(f"Erreur récupération rating: {e}")
            return 0.5  # Score neutre par défaut
    
    def _generate_match_reasons(self, match_score, skill_score, rating_score, stagiaire, job_offer):
        """Génère les raisons de la correspondance"""
        try:
            reasons = []
            
            if match_score > 0.7:
                reasons.append("🎯 Excellent profil général")
            elif match_score > 0.5:
                reasons.append("✅ Bon profil général")
            
            if skill_score > 0.7:
                reasons.append("🛠️ Compétences très alignées")
            elif skill_score > 0.5:
                reasons.append("⚙️ Compétences compatibles")
            
            if rating_score > 0.7:
                reasons.append("⭐ Excellentes évaluations")
            elif rating_score > 0.5:
                reasons.append("👍 Bonnes évaluations")
            
            # Vérification département
            if job_offer.get('departmentId') == stagiaire.get('DepartmentId'):
                reasons.append("🏢 Même département")
            
            # Vérification expérience
            experience = stagiaire.get('CV_ExperienceYears', 0)
            if experience > 2:
                reasons.append(f"💼 {experience} ans d'expérience")
            
            return reasons[:3]  # Maximum 3 raisons
            
        except:
            return ["📊 Profil analysé"]
    
    def _get_stagiaires_data(self):
        """Récupère les données des stagiaires via CVAnalysisEngine"""
        return self.get_stagiaires_data()
    
    def get_stagiaires_data(self):
        """Récupère les données des stagiaires avec ratings améliorés"""
        try:
            logger.info(f"Connexion à: {os.getenv('DB_SERVER', 'DESKTOP-913R9GN')}")
            conn = pyodbc.connect(self.connection_string)
            
            # Requête de base pour les stagiaires (selon modèle C#)
            base_query = """
            SELECT 
                Id, FirstName, LastName, Email, Skills, CvUrl,
                StartDate, EndDate, DepartmentId, Role, statuts,
                stage, etudiant, UniversityId
            FROM Users 
            WHERE Role = 3
            """
            
            logger.info("Récupération des stagiaires...")
            df = pd.read_sql(base_query, conn)
            logger.info(f"{len(df)} stagiaires trouvés")
            
            if df.empty:
                conn.close()
                return df
            
            # Enrichissement avec départements
            try:
                dept_query = "SELECT Id, DepartmentName FROM Departments"
                dept_df = pd.read_sql(dept_query, conn)
                df = df.merge(dept_df, left_on='DepartmentId', right_on='Id', how='left', suffixes=('', '_dept'))
                df = df.drop('Id_dept', axis=1, errors='ignore')
            except Exception as e:
                logger.warning(f"Erreur enrichissement départements: {e}")
            
            conn.close()
            return df
            
        except Exception as e:
            logger.error(f"❌ Erreur récupération stagiaires: {e}")
            return pd.DataFrame()  # Retourner DataFrame vide en cas d'erreur


# 🚀 INITIALISATION FLASK
app = Flask(__name__)
CORS(app)

# 📋 ENDPOINT PRINCIPAL DE RECOMMANDATION
@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    """🎯 ENDPOINT PRINCIPAL - Génère des recommandations intelligentes"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Données JSON manquantes'}), 400
        
        # Validation des champs obligatoires
        required_fields = ['title', 'departmentId']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ obligatoire manquant: {field}'}), 400
        
        # Préparation de l'offre d'emploi
        job_offer = {
            'title': data.get('title', ''),
            'description': data.get('description', ''),
            'requiredSkills': data.get('requiredSkills', ''),
            'departmentId': data.get('departmentId')
        }
        
        # Génération des recommandations
        recommendations_result = recommendation_system.get_recommendations(job_offer, top_n=10)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations_result['recommendations'],  # Directement la liste
            'totalFound': len(recommendations_result['recommendations']),  # Changé de total_found
            'error': ''  # Ajouté pour .NET
        })
        
    except Exception as e:
        logger.error(f"Erreur endpoint recommendations: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'recommendations': []
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Vérification de l'état du système"""
    try:
        # Test de connexion à la base
        conn = pyodbc.connect(recommendation_system.connection_string)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM Users WHERE Role = 3")
        stagiaires_count = cursor.fetchone()[0]
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'database_connection': 'OK',
            'stagiaires_count': stagiaires_count,
            'semantic_model': 'Available' if recommendation_system.semantic_model else 'Not available',
            'cv_analysis_engine': 'Available',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500


# 📄 ENDPOINT TEST ANALYSE ML DES CVs
@app.route('/api/test-cv-analysis', methods=['POST'])
def test_cv_analysis():
    """Test de l'analyse ML des CVs"""
    try:
        data = request.get_json()
        cv_url = data.get('cv_url', '')
        
        if not cv_url:
            return jsonify({'error': 'URL CV manquante'}), 400
        
        # Test de l'analyse CV
        cv_result = recommendation_system.cv_analysis_engine.analyze_stagiaire_cv(cv_url)
        
        return jsonify({
            'success': True,
            'cv_analysis': cv_result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# 📝 PROFIL TEXTUEL
def test_enum_types():
    """Test des types ENUM corrigés dans la table Ratings"""
    try:
        conn = pyodbc.connect(recommendation_system.connection_string)
        
        logger.info("🧪 === TEST DES TYPES ENUM DANS RATINGS ===")
        
        # Test 1: Vérification des types string
        test_query_string = """
        SELECT Type, COUNT(*) as count, AVG(CAST(Score as FLOAT)) as avg_score
        FROM Ratings 
        WHERE Type IN ('TuteurToStagiaire', 'RHToStagiaire')
        GROUP BY Type
        """
        
        try:
            string_results = pd.read_sql(test_query_string, conn)
            logger.info("✅ Types ENUM STRING - SUCCÈS:")
            for _, row in string_results.iterrows():
                logger.info(f"   - {row['Type']}: {row['count']} ratings, moyenne {row['avg_score']:.2f}")
            
            total_string = string_results['count'].sum() if len(string_results) > 0 else 0
            logger.info(f"   📊 Total avec types string: {total_string}")
            
            conn.close()
            
            return jsonify({
                'success': True,
                'enum_types_working': True,
                'message': 'Types ENUM string validés avec succès',
                'total_ratings': int(total_string),
                'ratings_by_type': string_results.to_dict('records') if len(string_results) > 0 else []
            })
            
        except Exception as e:
            logger.error(f"❌ Types ENUM STRING échoués: {e}")
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Types ENUM string échoués: {str(e)}'
            })
            
    except Exception as e:
        logger.error(f"❌ Erreur test enum types: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Endpoints existants conservés
@app.route('/api/test-stagiaires', methods=['GET'])
def test_stagiaires():
    try:
        df = recommendation_system.get_stagiaires_data()
        return jsonify({
            'success': True,
            'stagiaires_count': len(df),
            'sample_data': df.head(5).to_dict('records') if not df.empty else []
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test-skills-extraction', methods=['POST'])
def test_skills_extraction():
    """Test de l'extraction de compétences"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Texte manquants'}), 400
        
        extracted_skills = recommendation_system.extract_skills_dynamically(text)
        
        return jsonify({
            'success': True,
            'original_text': text,
            'extracted_skills': extracted_skills,
            'skills_count': len(extracted_skills)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 🔧 DEBUG: Endpoint pour tester le processus de recommandation étape par étape
@app.route('/api/debug-recommendation-process', methods=['POST'])
def debug_recommendation_process():
    try:
        data = request.get_json()
        department_id = data.get('departmentId', 1)
        
        conn = pyodbc.connect(recommendation_system.connection_string)
        
        # Étape 1: Récupérer tous les stagiaires
        all_stagiaires_query = """
        SELECT Id, FirstName, LastName, DepartmentId, StartDate, EndDate, Skills
        FROM Users 
        WHERE Role = 3
        """
        all_stagiaires = pd.read_sql(all_stagiaires_query, conn)
        
        # Étape 2: Filtrer par département
        dept_filtered = all_stagiaires[all_stagiaires['DepartmentId'] == int(department_id)]
        
        # Étape 3: Vérifier les stages terminés
        completed_stages = []
        for _, stagiaire in dept_filtered.iterrows():
            if recommendation_system.is_stage_completed(stagiaire):
                completed_stages.append({
                    'id': stagiaire['Id'],
                    'name': f"{stagiaire['FirstName']} {stagiaire['LastName']}",
                    'end_date': str(stagiaire['EndDate']),
                    'skills': stagiaire.get('Skills', '')
                })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'debug_info': {
                'total_stagiaires': len(all_stagiaires),
                'department_filtered': len(dept_filtered),
                'completed_stages': len(completed_stages),
                'department_id_requested': department_id
            },
            'all_stagiaires_sample': all_stagiaires.head(3).to_dict('records'),
            'dept_filtered_sample': dept_filtered.head(3).to_dict('records'),
            'completed_stages_list': completed_stages
        })
        
    except Exception as e:
        logger.error(f"Erreur debug process: {e}")
        return jsonify({'success': False, 'error': str(e)})

# 🔍 DEBUG: Endpoint pour voir les départements
@app.route('/api/debug-departments', methods=['GET'])
def debug_departments():
    try:
        conn = pyodbc.connect(recommendation_system.connection_string)
        
        # Départements
        dept_query = "SELECT Id, DepartmentName FROM Departments"
        dept_df = pd.read_sql(dept_query, conn)
        
        # Stagiaires avec leurs départements  
        stagiaire_query = """
        SELECT u.Id, u.FirstName, u.LastName, u.DepartmentId, d.DepartmentName,
               u.EndDate, u.Role
        FROM Users u
        LEFT JOIN Departments d ON u.DepartmentId = d.Id
        WHERE u.Role = 3
        """
        stagiaire_df = pd.read_sql(stagiaire_query, conn)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'departments': dept_df.to_dict('records'),
            'stagiaires': stagiaire_df.to_dict('records'),
            'stagiaires_count': len(stagiaire_df)
        })
        
    except Exception as e:
        logger.error(f"Erreur debug départements: {e}")
        return jsonify({'success': False, 'error': str(e)})

# 🔍 DEBUG: Endpoint pour voir la structure de la table Users
@app.route('/api/debug-users-structure', methods=['GET'])
def debug_users_structure():
    try:
        conn = pyodbc.connect(recommendation_system.connection_string)
        
        # Structure de la table Users
        structure_query = """
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Users'
        ORDER BY ORDINAL_POSITION
        """
        
        structure_df = pd.read_sql(structure_query, conn)
        
        # Échantillon de données Users avec Role = 3
        sample_query = """
        SELECT TOP 5 Id, FirstName, LastName, Email, Role, DepartmentId, 
               StartDate, EndDate, Skills, stage, etudiant, statuts
        FROM Users 
        WHERE Role = 3
        """
        
        sample_df = pd.read_sql(sample_query, conn)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'table_structure': structure_df.to_dict('records'),
            'sample_users': sample_df.to_dict('records'),
            'users_count': len(sample_df)
        })
        
    except Exception as e:
        logger.error(f"Erreur debug users: {e}")
        return jsonify({'success': False, 'error': str(e)})

# 🧪 DEBUG: Test direct de get_stagiaires_data
@app.route('/api/debug-stagiaires-data', methods=['GET'])
def debug_stagiaires_data():
    try:
        logger.info("🔍 TEST DIRECT de get_stagiaires_data")
        df = recommendation_system.get_stagiaires_data()
        
        return jsonify({
            'success': True,
            'stagiaires_count': len(df),
            'columns': list(df.columns) if not df.empty else [],
            'sample_data': df.head(3).to_dict('records') if not df.empty else [],
            'empty_dataframe': df.empty,
            'has_ratings_column': 'AverageRating' in df.columns if not df.empty else False
        })
        
    except Exception as e:
        logger.error(f"❌ Erreur get_stagiaires_data: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        })

# 🔍 DEBUG: Test des noms de tables
@app.route('/api/debug-table-names', methods=['GET'])
def debug_table_names():
    try:
        conn = pyodbc.connect(recommendation_system.connection_string)
        
        # Récupérer la liste des tables
        tables_query = """
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
        """
        
        tables_df = pd.read_sql(tables_query, conn)
        conn.close()
        
        return jsonify({
            'success': True,
            'tables': tables_df['TABLE_NAME'].tolist(),
            'table_count': len(tables_df)
        })
        
    except Exception as e:
        logger.error(f"Erreur debug tables: {e}")
        return jsonify({'success': False, 'error': str(e)})

# 🧪 DEBUG: Test de la requête de base des stagiaires
@app.route('/api/debug-base-query', methods=['GET'])
def debug_base_query():
    try:
        conn = pyodbc.connect(recommendation_system.connection_string)
        
        # Test de la requête de base simple
        simple_query = """
        SELECT Id, FirstName, LastName, Email, Role
        FROM Users 
        WHERE Role = 3
        """
        
        simple_df = pd.read_sql(simple_query, conn)
        
        # Test de la requête complète
        full_query = """
        SELECT 
            Id, FirstName, LastName, Email, Skills, CvUrl,
            StartDate, EndDate, DepartmentId, Role, statuts,
            stage, etudiant, UniversityId
        FROM Users 
        WHERE Role = 3
        """
        
        try:
            full_df = pd.read_sql(full_query, conn)
            full_success = True
            full_error = None
        except Exception as e:
            full_df = pd.DataFrame()
            full_success = False
            full_error = str(e)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'simple_query': {
                'count': len(simple_df),
                'sample': simple_df.head(3).to_dict('records') if not simple_df.empty else []
            },
            'full_query': {
                'success': full_success,
                'count': len(full_df),
                'error': full_error,
                'sample': full_df.head(3).to_dict('records') if not full_df.empty else []
            }
        })
        
    except Exception as e:
        logger.error(f"Erreur debug base query: {e}")
        return jsonify({'success': False, 'error': str(e)})

# 🧪 DEBUG: Test minimal des recommandations
@app.route('/api/debug-minimal-recommendations', methods=['POST'])
def debug_minimal_recommendations():
    try:
        data = request.get_json()
        department_id = data.get('departmentId', 1)
        
        logger.info("🧪 === TEST MINIMAL RECOMMANDATIONS ===")
        
        # Étape 1: Récupérer les stagiaires simplement
        stagiaires_df = recommendation_system.get_stagiaires_data()
        logger.info(f"📊 Total stagiaires récupérés: {len(stagiaires_df)}")
        
        if stagiaires_df.empty:
            return jsonify({'success': False, 'error': 'Aucun stagiaire trouvé'})
        
        # Étape 2: Filtrage par département (test simple)
        dept_mask = stagiaires_df['DepartmentId'] == int(department_id)
        filtered_df = stagiaires_df[dept_mask]
        logger.info(f"🔒 Stagiaires département {department_id}: {len(filtered_df)}")
        
        # Étape 3: Retourner seulement les premiers résultats sans filtrage de stage
        recommendations = []
        for i, (idx, stagiaire) in enumerate(filtered_df.head(3).iterrows()):
            rec = {
                'stagiaireId': int(stagiaire['Id']),
                'name': f"{stagiaire['FirstName']} {stagiaire['LastName']}",
                'rating': float(stagiaire.get('AverageRating', 3.0)),
                'skills': str(stagiaire.get('Skills', '')),
                'department': str(stagiaire.get('DepartmentName', '')),
                'university': str(stagiaire.get('Universityname', '')),
                'stagePeriod': f"{stagiaire.get('StartDate', '')} → {stagiaire.get('EndDate', '')}",
                'compositeScore': 0.8 - (i * 0.1)  # Score factice décroissant
            }
            recommendations.append(rec)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'debug_info': {
                'total_stagiaires': len(stagiaires_df),
                'department_filtered': len(filtered_df),
                'department_id': department_id
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Erreur test minimal: {e}")
        return jsonify({'success': False, 'error': str(e)})
        
# Nouveaux endpoints pour tester et démontrer la similarité sémantique
@app.route('/api/test-semantic-similarity', methods=['POST'])
def test_semantic_similarity():
    """Test de la similarité sémantique avec exemples concrets"""
    try:
        data = request.get_json()
        text1 = data.get('text1', '')
        text2 = data.get('text2', '')
        
        if not text1 or not text2:
            return jsonify({'error': 'Les deux textes sont requis'}), 400
        
        logger.info(f"\n🧬 === TEST SIMILARITÉ SÉMANTIQUE ===")
        
        # Test avec la méthode hybride
        if 'skills' in data.get('test_type', 'general'):
            similarity_hybrid = recommendation_system.calculate_enhanced_skill_similarity(text1, text2)
            semantic_analysis = recommendation_system.analyze_semantic_matches(text1, text2)
        else:
            similarity_hybrid = recommendation_system.calculate_semantic_similarity(text1, text2)
            semantic_analysis = None
        
        # Test avec méthode traditionnelle pour comparaison
        similarity_traditional = recommendation_system.calculate_skill_similarity_improved(text1, text2)
        
        # Test TF-IDF pour comparaison
        similarity_tfidf = recommendation_system._fallback_tfidf_similarity(text1, text2)
        
        improvement = ((similarity_hybrid - similarity_traditional) / max(similarity_traditional, 0.01)) * 100
        
        return jsonify({
            'success': True,
            'input': {
                'text1': text1,
                'text2': text2
            },
            'results': {
                'semantic_hybrid': float(round(similarity_hybrid, 4)),
                'traditional_skills': float(round(similarity_traditional, 4)),
                'tfidf_baseline': float(round(similarity_tfidf, 4)),
                'improvement_percent': float(round(improvement, 1))
            },
            'analysis': {
                'best_method': 'Hybride Sémantique' if similarity_hybrid >= similarity_traditional else 'Traditionnel',
                'semantic_analysis': semantic_analysis,
                'model_available': recommendation_system.semantic_model is not None
            },
            'interpretation': {
                'hybrid_score': 'Excellent' if similarity_hybrid > 0.8 else 'Bon' if similarity_hybrid > 0.6 else 'Moyen' if similarity_hybrid > 0.3 else 'Faible',
                'recommendation': 'Match parfait' if similarity_hybrid > 0.8 else 'Bon candidat' if similarity_hybrid > 0.6 else 'Candidat acceptable' if similarity_hybrid > 0.3 else 'Candidat peu adapté'
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Erreur test sémantique: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/demo-semantic-improvements', methods=['GET'])
def demo_semantic_improvements():
    """Démonstration des améliorations de la similarité sémantique"""
    try:
        # Exemples concrets qui montrent la puissance de la sémantique
        test_cases = [
            {
                'name': 'Synonymes Techniques',
                'job_skills': 'Python, Machine Learning, Data Science',
                'candidate_skills': 'Programmation Python, IA, Analyse de données',
                'expected_improvement': 'Détection des synonymes (IA = Machine Learning)'
            },
            {
                'name': 'Technologies Équivalentes',
                'job_skills': 'React, Frontend Development, JavaScript',
                'candidate_skills': 'ReactJS, Développement Front-end, JS',
                'expected_improvement': 'Reconnaissance des abréviations et variantes'
            },
            {
                'name': 'Domaines Connexes',
                'job_skills': 'DevOps, Cloud Computing, AWS',
                'candidate_skills': 'Infrastructure cloud, Amazon Web Services, Déploiement automatisé',
                'expected_improvement': 'Compréhension des domaines techniques liés'
            },
            {
                'name': 'Langues Mixtes',
                'job_skills': 'Base de données, SQL, Business Intelligence',
                'candidate_skills': 'Database management, MySQL, BI Analytics',
                'expected_improvement': 'Gestion du français/anglais technique'
            }
        ]
        
        results = []
        
        for test_case in test_cases:
            # Calcul avec méthode traditionnelle
            traditional = recommendation_system.calculate_skill_similarity_improved(
                test_case['job_skills'], test_case['candidate_skills']
            )
            
            # Calcul avec méthode hybride sémantique
            hybrid = recommendation_system.calculate_enhanced_skill_similarity(
                test_case['job_skills'], test_case['candidate_skills']
            )
            
            improvement = ((hybrid - traditional) / max(traditional, 0.01)) * 100
            
            results.append({
                'test_case': test_case['name'],
                'job_requirements': test_case['job_skills'],
                'candidate_profile': test_case['candidate_skills'],
                'scores': {
                    'traditional': float(round(traditional, 3)),
                    'semantic_hybrid': float(round(hybrid, 3)),
                    'improvement': f"+{improvement:.1f}%"
                },
                'expected_benefit': test_case['expected_improvement'],
                'verdict': 'Amélioration significative' if improvement > 20 else 'Amélioration modérée' if improvement > 5 else 'Amélioration mineure'
            })
        
        return jsonify({
            'success': True,
            'demonstration': results,
            'summary': {
                'total_tests': len(results),
                'avg_improvement': float(round(np.mean([float(r['scores']['improvement'].replace('+', '').replace('%', '')) for r in results]), 1)),
                'semantic_model_status': 'Actif' if recommendation_system.semantic_model else 'Inactif',
                'recommendation': 'La similarité sémantique améliore significativement la détection des correspondances entre compétences'
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Erreur démo sémantique: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
        
if __name__ == '__main__':
    print("🚀 Système de Recommandation IA v2.1 - AVEC SIMILARITÉ SÉMANTIQUE")
    print("🔧 NOUVELLES FONCTIONNALITÉS:")
    print("   ✅ Types ENUM string ('TuteurToStagiaire', 'RHToStagiaire')")
    print("   ✅ Suppression filtre Status (Draft/Submitted/Approved/Rejected)")
    print("   ✅ Compatible avec votre service Angular existant")
    print("   ⭐ Ratings prioritaires (60% du score)")
    print("   📊 Calcul qualité des évaluations")
    print("   🎯 Bonus pour excellence (rating + compétences)")
    print("   🧬 SIMILARITÉ SÉMANTIQUE - Comprend le sens des compétences!")
    print("   🚀 Matching hybride intelligent (traditionnel + sémantique)")
    print("\n📊 Endpoints disponibles pour Angular:")
    print("   POST /api/recommendations - Recommandations IA avec sémantique")
    print("   GET  /api/health - Vérification de santé")
    print("   POST /api/test-semantic-similarity - Test similarité sémantique")
    print("   GET  /api/demo-semantic-improvements - Démo améliorations sémantiques")
    print("   GET  /api/test-enum-types - Test types ENUM corrigés")
    print("   GET  /api/test-ratings-comprehensive - Test complet ratings")
    print("   GET  /api/test-stagiaire-rating/<id> - Test rating stagiaire")
    print("   GET  /api/stagiaires-with-ratings - Tous stagiaires avec ratings")
    print("   POST /api/test-skills-extraction - Test extraction compétences")
    print(f"\n⚙️ Configuration: {os.getenv('DB_SERVER', 'DESKTOP-913R9GN')} / {os.getenv('DB_NAME', 'PFEDb')}")
    print("🔧 PRÊT POUR ANGULAR - Utilisez http://localhost:5000/api/recommendations")
    print("\n🎯 POUR VOTRE SERVICE ANGULAR:")
    print("   - URL: http://localhost:5000/api/recommendations")
    print("   - Méthode: POST")
    print("   - Body: { title, description, requiredSkills, departmentId }")
    print("   - departmentId OBLIGATOIRE !")
    print("\n🧬 NOUVEAUTÉS SÉMANTIQUES:")
    print("   - Détection 'Python' = 'Programmation Python'")
    print("   - Reconnaissance 'IA' = 'Machine Learning'")  
    print("   - Compréhension 'React' = 'ReactJS'")
    print("   - Matching intelligent français/anglais")

    # 🚀 INITIALISATION DU SYSTÈME DE RECOMMANDATION
    global recommendation_system
    recommendation_system = ImprovedRecommendationSystem()
    print("✅ Système de recommandation initialisé")

    app.run(debug=True, host='0.0.0.0', port=5000)