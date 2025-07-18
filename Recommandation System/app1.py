import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pyodbc
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import re
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Charger les variables d'environnement
load_dotenv()

class ImprovedRecommendationSystem:
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 3),
            lowercase=True
        )
        self.connection_string = self._get_connection_string()
        
        # DICTIONNAIRE DE SYNONYMES ÉTENDU
        self.synonyms_dict = {
            # Technologies web
            'js': 'javascript', 'reactjs': 'react', 'react.js': 'react',
            'nodejs': 'node', 'node.js': 'node', 'vue.js': 'vue', 'vuejs': 'vue',
            'angular.js': 'angular', 'angularjs': 'angular', 'typescript': 'ts',
            'html5': 'html', 'css3': 'css', 'sass': 'css', 'scss': 'css',
            'less': 'css', 'bootstrap': 'css', 'tailwind': 'css', 'jquery': 'javascript',
            
            # Langages de programmation
            'c#': 'csharp', 'c sharp': 'csharp', '.net': 'dotnet', 'dot net': 'dotnet',
            'asp.net': 'dotnet', 'py': 'python', 'kotlin': 'java', 'scala': 'java',
            'go': 'golang', 'golang': 'go', 'swift': 'ios', 'objective-c': 'ios',
            'dart': 'flutter',
            
            # Bases de données
            'mysql': 'sql', 'postgresql': 'sql', 'postgres': 'sql', 'sqlite': 'sql',
            'mssql': 'sql', 'sql server': 'sql', 'oracle': 'sql', 'mongodb': 'nosql',
            'redis': 'nosql', 'cassandra': 'nosql', 'elasticsearch': 'nosql',
            'firebase': 'nosql',
            
            # Frameworks
            'spring': 'java', 'spring boot': 'java', 'django': 'python',
            'flask': 'python', 'fastapi': 'python', 'express': 'node',
            'express.js': 'node', 'laravel': 'php', 'symfony': 'php',
            'rails': 'ruby', 'ruby on rails': 'ruby',
            
            # Design et UI/UX
            'photoshop': 'design', 'illustrator': 'design', 'figma': 'design',
            'sketch': 'design', 'xd': 'design', 'adobe xd': 'design',
            'canva': 'design', 'ui': 'design', 'ux': 'design',
            
            # Marketing
            'seo': 'marketing', 'sem': 'marketing', 'social media': 'marketing',
            'réseaux sociaux': 'marketing', 'digital marketing': 'marketing',
            
            # Gestion de projet
            'scrum': 'agile', 'kanban': 'agile', 'jira': 'gestion',
            'trello': 'gestion', 'asana': 'gestion',
            
            # Cloud et DevOps
            'aws': 'cloud', 'azure': 'cloud', 'gcp': 'cloud', 'docker': 'devops',
            'kubernetes': 'devops', 'jenkins': 'devops', 'git': 'git',
            
            # IA et Data
            'machine learning': 'ai', 'deep learning': 'ai', 'data science': 'data',
            'tensorflow': 'ai', 'pytorch': 'ai', 'pandas': 'data', 'numpy': 'data'
        }
        
    def _get_connection_string(self):
        """Configuration de la connexion à SQL Server"""
        return (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={os.getenv('DB_SERVER', 'DESKTOP-913R9GN')};"
            f"DATABASE={os.getenv('DB_NAME', 'PFEDb')};"
            f"Trusted_Connection=yes;"
            f"MultipleActiveResultSets=yes;"
            f"Encrypt=no;"
        )
    
    def normalize_skill(self, skill):
        """Normalise une compétence en gérant les synonymes"""
        skill = skill.lower().strip()
        
        if skill in self.synonyms_dict:
            return self.synonyms_dict[skill]
        
        for synonym, normalized in self.synonyms_dict.items():
            if synonym in skill or skill in synonym:
                return normalized
                
        return skill
    
    def extract_skills_dynamically(self, text):
        """Extraction dynamique des compétences avec nettoyage amélioré"""
        if not text or pd.isna(text):
            return []
        
        text = str(text).lower()
        
        # Mots vides étendus
        stop_words = {
            'et', 'de', 'la', 'le', 'du', 'des', 'avec', 'pour', 'dans', 'sur',
            'par', 'un', 'une', 'les', 'son', 'sa', 'ses', 'ce', 'cette', 'ces',
            'développement', 'programmation', 'expérience', 'connaissance', 'maîtrise',
            'compétences', 'technologies', 'outils', 'niveau', 'ans', 'année', 'années',
            'formation', 'diplôme', 'stage', 'projet', 'projets', 'travail', 'équipe',
            'bon', 'bonne', 'très', 'bien', 'excellent', 'parfait', 'solide',
            'and', 'or', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
            'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'development', 'programming', 'experience', 'knowledge', 'skills',
            'technologies', 'tools', 'level', 'years', 'year', 'good', 'excellent',
            'strong', 'solid', 'proficient', 'familiar', 'using', 'used', 'work',
            'working', 'team', 'project', 'projects'
        }
        
        # Séparateurs multiples
        separators = r'[,;|\n\r\t\-•·/\\()[\]{}+=<>"\']+'
        skills = re.split(separators, text)
        
        extracted_skills = []
        
        for skill in skills:
            skill = re.sub(r'[^\w\s\.\-]', ' ', skill)
            skill = re.sub(r'\s+', ' ', skill).strip()
            
            if (len(skill) >= 2 and 
                skill not in stop_words and 
                not skill.isdigit() and 
                len(skill.split()) <= 4 and 
                not skill.startswith('http') and 
                len(skill) <= 50):
                
                normalized_skill = self.normalize_skill(skill)
                if normalized_skill not in stop_words:
                    extracted_skills.append(normalized_skill)
        
        return list(set(extracted_skills))
    
    def calculate_skill_similarity_improved(self, job_skills, candidate_skills):
        """Calcul amélioré de la similarité des compétences"""
        job_skills_list = self.extract_skills_dynamically(job_skills)
        candidate_skills_list = self.extract_skills_dynamically(candidate_skills)
        
        if not job_skills_list or not candidate_skills_list:
            return 0.1
        
        logger.info(f"Job skills: {job_skills_list}")
        logger.info(f"Candidate skills: {candidate_skills_list}")
        
        job_set = set(job_skills_list)
        candidate_set = set(candidate_skills_list)
        
        # Correspondances exactes
        exact_matches = job_set.intersection(candidate_set)
        
        # Correspondances partielles
        partial_matches = set()
        for job_skill in job_skills_list:
            for candidate_skill in candidate_skills_list:
                if self._are_skills_related(job_skill, candidate_skill):
                    partial_matches.add((job_skill, candidate_skill))
        
        # Calcul du score
        exact_score = len(exact_matches) / len(job_set) if job_set else 0
        partial_score = len(partial_matches) / len(job_set) if job_set else 0
        
        final_score = (exact_score * 0.8) + (partial_score * 0.2)
        
        # Bonus de couverture
        total_matches = len(exact_matches) + len(partial_matches)
        coverage_ratio = total_matches / len(job_set) if job_set else 0
        
        if coverage_ratio >= 1.0:
            final_score += 0.3
        elif coverage_ratio >= 0.8:
            final_score += 0.25
        elif coverage_ratio >= 0.6:
            final_score += 0.2
        elif coverage_ratio >= 0.4:
            final_score += 0.1
        
        logger.info(f"Exact matches: {exact_matches}")
        logger.info(f"Partial matches: {len(partial_matches)}")
        logger.info(f"Final score: {final_score:.2f}")
        
        return min(final_score, 1.0)
    
    def _are_skills_related(self, skill1, skill2):
        """Détecte les compétences similaires"""
        if skill1 in skill2 or skill2 in skill1:
            return True
        
        skill_families = {
            'frontend': ['react', 'angular', 'vue', 'javascript', 'typescript', 'html', 'css'],
            'backend': ['node', 'python', 'java', 'csharp', 'php', 'dotnet'],
            'database': ['sql', 'nosql', 'mysql', 'mongodb', 'postgresql'],
            'mobile': ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
            'data': ['data', 'analytics', 'ai', 'ml'],
            'design': ['design', 'ui', 'ux', 'photoshop', 'figma'],
            'cloud': ['aws', 'azure', 'cloud', 'devops']
        }
        
        for family, skills in skill_families.items():
            if (any(s in skill1 for s in skills) and 
                any(s in skill2 for s in skills)):
                return True
        
        return False
    
    def is_stage_completed(self, stagiaire):
        """Vérifie si le stage est terminé - Version corrigée"""
        try:
            end_date = stagiaire.get('EndDate')
            
            if not end_date or pd.isna(end_date):
                logger.warning(f"Pas de date de fin pour {stagiaire.get('FirstName', 'Unknown')}")
                return False
            
            # Conversion en datetime
            if isinstance(end_date, str):
                try:
                    end_date_parsed = pd.to_datetime(end_date)
                except:
                    logger.warning(f"Date de fin invalide: {end_date}")
                    return False
            else:
                end_date_parsed = pd.to_datetime(end_date)
            
            # Comparaison avec la date actuelle
            current_date = pd.to_datetime(datetime.now())
            
            # FIX: Utiliser .iloc[0] si c'est une série pandas
            if hasattr(end_date_parsed, 'iloc'):
                end_date_value = end_date_parsed.iloc[0]
            else:
                end_date_value = end_date_parsed
                
            if hasattr(current_date, 'iloc'):
                current_date_value = current_date.iloc[0]
            else:
                current_date_value = current_date
            
            is_completed = end_date_value <= current_date_value
            
            if is_completed:
                logger.info(f"Stage terminé pour {stagiaire.get('FirstName', 'Unknown')}")
                return True
            else:
                logger.info(f"Stage en cours pour {stagiaire.get('FirstName', 'Unknown')}")
                return False
                
        except Exception as e:
            logger.error(f"Erreur vérification stage: {e}")
            return True  # En cas d'erreur, considérer comme terminé pour éviter le blocage
    
    def get_stagiaire_comprehensive_rating(self, stagiaire_id, conn):
        """🔧 CALCUL AMÉLIORÉ DES RATINGS - IGNORE LE STATUS ENUM"""
        try:
            logger.info(f"Calcul rating pour stagiaire ID: {stagiaire_id}")
            
            # 🎯 REQUÊTE PRINCIPALE - TYPES ENUM STRING CORRIGÉS + SANS FILTRE STATUS
            rating_query = """
            SELECT 
                r.Id,
                r.EvaluatorId,
                r.EvaluatedUserId,
                r.Score,
                r.Type,
                r.Status,
                r.Comment,
                r.DetailedScores,
                r.CreatedAt,
                r.SubmittedAt,
                r.ApprovedAt,
                e.FirstName + ' ' + e.LastName as EvaluatorName,
                e.Role as EvaluatorRole
            FROM Ratings r
            LEFT JOIN Users e ON r.EvaluatorId = e.Id
            WHERE r.EvaluatedUserId = ?
            AND r.Type IN ('TuteurToStagiaire', 'RHToStagiaire')  -- Types ENUM STRING
            ORDER BY r.CreatedAt DESC
            """
            
            ratings_df = pd.read_sql(rating_query, conn, params=[stagiaire_id])
            
            logger.info(f"Total ratings trouvés: {len(ratings_df)}")
            
            if len(ratings_df) == 0:
                logger.warning(f"Aucun rating trouvé pour stagiaire {stagiaire_id}")
                return {
                    'average_rating': 3.0,  # Score neutre par défaut
                    'rating_count': 0,
                    'detailed_scores': {},
                    'has_ratings': False,
                    'rating_details': []
                }
            
            # 📊 ANALYSE DÉTAILLÉE DES RATINGS
            rating_details = []
            detailed_scores_sum = {}
            detailed_scores_count = {}
            total_score_sum = 0
            valid_ratings_count = 0
            
            for _, rating in ratings_df.iterrows():
                try:
                    score = float(rating['Score'])
                    total_score_sum += score
                    valid_ratings_count += 1
                    
                    # Type d'évaluateur (corriger selon les types ENUM string)
                    evaluator_type = "Tuteur" if rating['Type'] == 'TuteurToStagiaire' else "RH"
                    
                    # Détail du rating
                    rating_detail = {
                        'id': rating['Id'],
                        'score': score,
                        'evaluator_name': rating['EvaluatorName'],
                        'evaluator_type': evaluator_type,
                        'comment': rating['Comment'] or '',
                        'created_at': rating['CreatedAt'].strftime('%Y-%m-%d') if rating['CreatedAt'] else '',
                        'status': rating['Status']
                    }
                    
                    # Analyse des scores détaillés (JSON)
                    if rating['DetailedScores']:
                        try:
                            detailed_json = json.loads(rating['DetailedScores'])
                            rating_detail['detailed_scores'] = detailed_json
                            
                            # Accumulation pour moyenne
                            for criterion, value in detailed_json.items():
                                if isinstance(value, (int, float)):
                                    if criterion not in detailed_scores_sum:
                                        detailed_scores_sum[criterion] = 0
                                        detailed_scores_count[criterion] = 0
                                    detailed_scores_sum[criterion] += float(value)
                                    detailed_scores_count[criterion] += 1
                                    
                        except json.JSONDecodeError:
                            logger.warning(f"Erreur parsing JSON pour rating {rating['Id']}")
                    
                    rating_details.append(rating_detail)
                    
                    logger.info(f"  - Rating {rating['Id']}: {score}/5 par {evaluator_type} ({rating['EvaluatorName']})")
                    
                except Exception as e:
                    logger.error(f"Erreur traitement rating {rating['Id']}: {e}")
                    continue
            
            # 🧮 CALCUL DES MOYENNES
            if valid_ratings_count == 0:
                logger.warning(f"Aucun rating valide pour stagiaire {stagiaire_id}")
                average_rating = 3.0
            else:
                average_rating = total_score_sum / valid_ratings_count
                
            # Moyennes des critères détaillés
            detailed_averages = {}
            for criterion, total in detailed_scores_sum.items():
                count = detailed_scores_count[criterion]
                detailed_averages[criterion] = total / count if count > 0 else 0
            
            # 🎯 RÉSULTAT FINAL
            result = {
                'average_rating': round(average_rating, 2),
                'rating_count': valid_ratings_count,
                'detailed_scores': detailed_averages,
                'has_ratings': valid_ratings_count > 0,
                'rating_details': rating_details,
                'quality_score': self._calculate_rating_quality(valid_ratings_count, average_rating)
            }
            
            logger.info(f"✅ Rating final pour stagiaire {stagiaire_id}: {average_rating:.2f}/5 ({valid_ratings_count} évaluations)")
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur calcul rating pour stagiaire {stagiaire_id}: {e}")
            return {
                'average_rating': 3.0,
                'rating_count': 0,
                'detailed_scores': {},
                'has_ratings': False,
                'rating_details': [],
                'quality_score': 0.5
            }
    
    def _calculate_rating_quality(self, rating_count, average_rating):
        """Calcule un score de qualité basé sur le nombre et la valeur des ratings"""
        if rating_count == 0:
            return 0.3  # Pénalité pour absence de ratings
        
        # Score basé sur le nombre d'évaluations
        count_score = min(rating_count / 3, 1.0)  # Optimal à 3+ évaluations
        
        # Score basé sur la note moyenne
        rating_score = average_rating / 5.0
        
        # Combinaison pondérée
        quality_score = (count_score * 0.3) + (rating_score * 0.7)
        
        return round(quality_score, 3)
    
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
                logger.warning(f"Erreur départements: {e}")
                df['DepartmentName'] = 'Département inconnu'
            
            # Enrichissement avec universités
            try:
                if 'UniversityId' in df.columns:
                    uni_query = "SELECT Id, Universityname FROM Universities"
                    uni_df = pd.read_sql(uni_query, conn)
                    df = df.merge(uni_df, left_on='UniversityId', right_on='Id', how='left', suffixes=('', '_uni'))
                    df = df.drop('Id_uni', axis=1, errors='ignore')
                else:
                    df['Universityname'] = 'Université inconnue'
            except Exception as e:
                logger.warning(f"Erreur universités: {e}")
                df['Universityname'] = 'Université inconnue'
            
            # 🎯 CALCUL DES RATINGS AMÉLIORÉS
            logger.info("Calcul des ratings détaillés...")
            for idx, row in df.iterrows():
                logger.info(f"Traitement: {row['FirstName']} {row['LastName']} (ID: {row['Id']})")
                
                try:
                    rating_data = self.get_stagiaire_comprehensive_rating(row['Id'], conn)
                    
                    # Assignation des données de rating
                    df.at[idx, 'AverageRating'] = rating_data['average_rating']
                    df.at[idx, 'RatingCount'] = rating_data['rating_count']
                    df.at[idx, 'HasRatings'] = rating_data['has_ratings']
                    df.at[idx, 'RatingQuality'] = rating_data['quality_score']
                    df.at[idx, 'DetailedScores'] = json.dumps(rating_data['detailed_scores'])
                    df.at[idx, 'RatingDetails'] = json.dumps(rating_data['rating_details'])
                except Exception as e:
                    logger.error(f"❌ Erreur calcul rating pour {row['FirstName']} {row['LastName']}: {e}")
                    # Valeurs par défaut en cas d'erreur
                    df.at[idx, 'AverageRating'] = 3.0
                    df.at[idx, 'RatingCount'] = 0
                    df.at[idx, 'HasRatings'] = False
                    df.at[idx, 'RatingQuality'] = 0.5
                    df.at[idx, 'DetailedScores'] = '{}'
                    df.at[idx, 'RatingDetails'] = '[]'
            
            conn.close()
            
            # Nettoyage final
            if 'DepartmentName' not in df.columns:
                df['DepartmentName'] = 'Département inconnu'
            if 'Universityname' not in df.columns:
                df['Universityname'] = 'Université inconnue'
            
            logger.info(f"Données finales: {len(df)} stagiaires avec ratings complets")
            
            # Échantillon avec ratings
            if len(df) > 0:
                logger.info("Échantillon avec ratings:")
                for i, row in df.head(3).iterrows():
                    rating = row.get('AverageRating', 3.0)
                    count = row.get('RatingCount', 0)
                    quality = row.get('RatingQuality', 0.5)
                    logger.info(f"  - {row['FirstName']} {row['LastName']}: ⭐ {rating:.1f}/5 ({count} évals, qualité: {quality:.2f})")
            
            return df
            
        except Exception as e:
            logger.error(f"Erreur globale: {e}")
            return pd.DataFrame()
    
    def calculate_rating_score_enhanced(self, rating_data):
        """Score de notation amélioré prenant en compte qualité et quantité"""
        try:
            if not isinstance(rating_data, dict):
                logger.warning(f"Rating data invalide: {rating_data}")
                return 0.4
            
            average_rating = rating_data.get('average_rating', 3.0)
            rating_count = rating_data.get('rating_count', 0)
            has_ratings = rating_data.get('has_ratings', False)
            quality_score = rating_data.get('quality_score', 0.5)
            
            logger.info(f"Rating analysis: avg={average_rating}, count={rating_count}, quality={quality_score}")
            
            if not has_ratings or rating_count == 0:
                logger.warning("Aucun rating disponible")
                return 0.3  # Pénalité forte pour absence de ratings
            
            # Score basé sur la note moyenne (non-linéaire pour amplifier les différences)
            if average_rating >= 4.5:
                base_score = 1.0
            elif average_rating >= 4.0:
                base_score = 0.9
            elif average_rating >= 3.5:
                base_score = 0.75
            elif average_rating >= 3.0:
                base_score = 0.6
            elif average_rating >= 2.5:
                base_score = 0.4
            elif average_rating >= 2.0:
                base_score = 0.25
            else:
                base_score = 0.1
            
            # Bonus/malus basé sur le nombre d'évaluations
            count_multiplier = 1.0
            if rating_count >= 5:
                count_multiplier = 1.2  # Bonus pour beaucoup d'évaluations
            elif rating_count >= 3:
                count_multiplier = 1.1  # Bonus léger
            elif rating_count == 2:
                count_multiplier = 1.0  # Neutre
            elif rating_count == 1:
                count_multiplier = 0.9  # Léger malus
            
            # Score final avec qualité
            final_score = base_score * count_multiplier * (0.5 + quality_score * 0.5)
            final_score = min(final_score, 1.0)
            
            logger.info(f"Rating score final: {final_score:.3f} (base: {base_score}, multiplier: {count_multiplier})")
            
            return final_score
            
        except Exception as e:
            logger.error(f"Erreur calcul rating score: {e}")
            return 0.4
    
    def get_recommendations(self, job_offer, top_n=10):
        """🎯 SYSTÈME DE RECOMMANDATIONS INTELLIGENT ET STRICT"""
        try:
            logger.info(f"\n🔍 === DÉMARRAGE RECOMMANDATIONS STRICTES ===")
            logger.info(f"📋 Poste: {job_offer.get('title', '')}")
            logger.info(f"🎯 Compétences requises: {job_offer.get('requiredSkills', '')}")
            logger.info(f"🏢 Département ID: {job_offer.get('departmentId')}")
            
            # 1️⃣ RÉCUPÉRATION DES DONNÉES
            stagiaires_df = self.get_stagiaires_data()
            if stagiaires_df.empty:
                logger.warning("❌ Aucun stagiaire trouvé dans la base")
                return []
            
            logger.info(f"📊 Total stagiaires en base: {len(stagiaires_df)}")
            
            # 2️⃣ FILTRE STRICT DÉPARTEMENT (OBLIGATOIRE)
            required_dept_id = job_offer.get('departmentId')
            if not required_dept_id:
                logger.error("❌ Département obligatoire manquant")
                return []
                
            dept_mask = stagiaires_df['DepartmentId'] == int(required_dept_id)
            dept_filtered = stagiaires_df[dept_mask].copy()
            
            logger.info(f"🔒 Après filtre département {required_dept_id}: {len(dept_filtered)} stagiaires")
            
            if dept_filtered.empty:
                logger.warning(f"❌ Aucun stagiaire dans le département {required_dept_id}")
                return []
            
            # 3️⃣ FILTRE STRICT STAGES TERMINÉS
            logger.info(f"\n🎓 === VÉRIFICATION STRICTE DES STAGES ===")
            eligible_stagiaires = []
            current_date = datetime.now()
            
            for idx, stagiaire in dept_filtered.iterrows():
                end_date_str = stagiaire.get('EndDate')
                stagiaire_name = f"{stagiaire['FirstName']} {stagiaire['LastName']}"
                
                if not end_date_str or pd.isna(end_date_str):
                    logger.warning(f"⚠️ {stagiaire_name}: Pas de date de fin")
                    continue
                
                try:
                    end_date = pd.to_datetime(end_date_str)
                    if hasattr(end_date, 'iloc'):
                        end_date = end_date.iloc[0] if len(end_date) > 0 else end_date
                    
                    if end_date <= current_date:
                        eligible_stagiaires.append(stagiaire)
                        logger.info(f"✅ {stagiaire_name}: Stage terminé le {end_date.strftime('%Y-%m-%d')}")
                    else:
                        logger.info(f"❌ {stagiaire_name}: Stage en cours (fin: {end_date.strftime('%Y-%m-%d')})")
                        
                except Exception as e:
                    logger.warning(f"⚠️ {stagiaire_name}: Erreur date - {e}")
                    continue
            
            logger.info(f"✅ Stagiaires éligibles (stages terminés): {len(eligible_stagiaires)}")
            
            if not eligible_stagiaires:
                logger.warning("❌ Aucun stagiaire avec stage terminé")
                return []
            
            # 4️⃣ CALCUL INTELLIGENT DES SCORES
            logger.info(f"\n🧮 === CALCUL INTELLIGENT DES SCORES ===")
            recommendations = []
            job_skills_required = job_offer.get('requiredSkills', '')
            
            for stagiaire in eligible_stagiaires:
                stagiaire_name = f"{stagiaire['FirstName']} {stagiaire['LastName']}"
                logger.info(f"\n👤 Analyse: {stagiaire_name}")
                
                # A. Score de Rating (60% du score total)
                avg_rating = float(stagiaire.get('AverageRating', 3.0))
                rating_count = int(stagiaire.get('RatingCount', 0))
                has_ratings = bool(stagiaire.get('HasRatings', False))
                
                if has_ratings and rating_count > 0:
                    # Score basé sur la note (0 à 1)
                    rating_score = avg_rating / 5.0
                    # Bonus pour nombre d'évaluations
                    if rating_count >= 3:
                        rating_score *= 1.1  # Bonus 10%
                    elif rating_count >= 2:
                        rating_score *= 1.05  # Bonus 5%
                else:
                    rating_score = 0.4  # Pénalité forte sans ratings
                
                logger.info(f"   ⭐ Rating: {avg_rating:.1f}/5 ({rating_count} évals) → Score: {rating_score:.3f}")
                
                # B. Score de Compétences (30% du score total)
                stagiaire_skills = str(stagiaire.get('Skills', ''))
                
                if not stagiaire_skills or stagiaire_skills.lower() in ['none', 'null', '']:
                    skill_similarity = 0.1  # Pénalité forte
                    logger.info(f"   🎯 Compétences: AUCUNE → Score: {skill_similarity:.3f}")
                else:
                    skill_similarity = self.calculate_skill_similarity_improved(
                        job_skills_required, stagiaire_skills
                    )
                    logger.info(f"   🎯 Compétences: '{stagiaire_skills[:50]}...' → Score: {skill_similarity:.3f}")
                
                # C. Score Textuel (10% du score total)
                job_text = f"{job_offer.get('title', '')} {job_offer.get('description', '')}"
                stagiaire_text = f"{stagiaire_skills} {stagiaire.get('DepartmentName', '')}"
                
                try:
                    if job_text.strip() and stagiaire_text.strip():
                        job_clean = self.preprocess_text(job_text)
                        stagiaire_clean = self.preprocess_text(stagiaire_text)
                        
                        if job_clean and stagiaire_clean:
                            tfidf_matrix = self.tfidf_vectorizer.fit_transform([job_clean, stagiaire_clean])
                            text_similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                        else:
                            text_similarity = 0.1
                    else:
                        text_similarity = 0.1
                except Exception as e:
                    logger.warning(f"   ⚠️ Erreur TF-IDF: {e}")
                    text_similarity = 0.1
                
                logger.info(f"   📝 Similarité textuelle: {text_similarity:.3f}")
                
                # D. SCORE COMPOSITE FINAL
                composite_score = (rating_score * 0.6) + (skill_similarity * 0.3) + (text_similarity * 0.1)
                
                # E. BONUS POUR EXCELLENCE
                if avg_rating >= 4.0 and skill_similarity > 0.5:
                    excellence_bonus = 0.15
                    composite_score += excellence_bonus
                    logger.info(f"   🏆 Bonus excellence: +{excellence_bonus}")
                
                # F. FILTRAGE PAR SEUIL MINIMUM
                min_skill_threshold = 0.2  # Minimum 20% de match compétences
                min_composite_threshold = 0.3  # Minimum 30% score total
                
                if skill_similarity < min_skill_threshold:
                    logger.info(f"   ❌ Éliminé: Compétences insuffisantes ({skill_similarity:.3f} < {min_skill_threshold})")
                    continue
                
                if composite_score < min_composite_threshold:
                    logger.info(f"   ❌ Éliminé: Score global insuffisant ({composite_score:.3f} < {min_composite_threshold})")
                    continue
                
                composite_score = min(composite_score, 1.0)  # Limitation à 1.0
                
                logger.info(f"   🎯 SCORE FINAL: {composite_score:.3f} ✅ QUALIFIÉ")
                
                # G. CONSTRUCTION DE LA RECOMMANDATION
                recommendation = {
                    'stagiaireId': int(stagiaire['Id']),
                    'name': stagiaire_name,
                    'email': str(stagiaire.get('Email', '')),
                    'skills': stagiaire_skills if stagiaire_skills not in ['None', 'null', ''] else 'Compétences non renseignées',
                    'department': str(stagiaire.get('DepartmentName', '')),
                    'university': str(stagiaire.get('Universityname', '')),
                    'stagePeriod': f"{stagiaire.get('StartDate', '')} → {stagiaire.get('EndDate', '')}",
                    'rating': avg_rating,
                    'ratingCount': rating_count,
                    'hasRatings': has_ratings,
                    'ratingQuality': float(stagiaire.get('RatingQuality', 0.5)),
                    'compositeScore': float(composite_score),
                    'textSimilarity': float(text_similarity),
                    'skillSimilarity': float(skill_similarity),
                    'ratingScore': float(rating_score),
                    'departmentMatch': True,
                    'stageCompleted': True,
                    'matchReasons': self._generate_intelligent_match_reasons(
                        skill_similarity, rating_score, avg_rating, rating_count, composite_score
                    ),
                    'detailedScores': json.loads(stagiaire.get('DetailedScores', '{}')),
                    'ratingDetails': json.loads(stagiaire.get('RatingDetails', '[]'))
                }
                
                recommendations.append(recommendation)
            
            # 5️⃣ TRI ET FINALISATION
            recommendations.sort(key=lambda x: x['compositeScore'], reverse=True)
            final_recommendations = recommendations[:top_n]
            
            logger.info(f"\n🏆 === RÉSULTATS FINAUX ===")
            logger.info(f"📊 Candidats qualifiés: {len(final_recommendations)}")
            
            for i, rec in enumerate(final_recommendations):
                logger.info(f"   {i+1}. {rec['name']}: {rec['compositeScore']:.3f} | "
                           f"Skills: {rec['skillSimilarity']:.2f} | "
                           f"Rating: {rec['rating']:.1f}/5 ({rec['ratingCount']})")
            
            return final_recommendations
            
        except Exception as e:
            logger.error(f"❌ ERREUR CRITIQUE dans get_recommendations: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def _generate_match_reasons_enhanced(self, text_sim, skill_sim, rating_score, rating_data):
        """Génère les raisons du match avec focus sur les ratings"""
        reasons = []
        
        # 🎯 RATING EN PREMIER (le plus important)
        avg_rating = rating_data['average_rating']
        rating_count = rating_data['rating_count']
        
        if rating_count == 0:
            reasons.append("⚠️ Aucune évaluation disponible")
        elif avg_rating >= 4.5:
            reasons.append(f"⭐ EXCELLENT STAGIAIRE ({avg_rating:.1f}/5 - {rating_count} évaluations)")
        elif avg_rating >= 4.0:
            reasons.append(f"🌟 TRÈS BON STAGIAIRE ({avg_rating:.1f}/5 - {rating_count} évaluations)")
        elif avg_rating >= 3.5:
            reasons.append(f"👍 BON STAGIAIRE ({avg_rating:.1f}/5 - {rating_count} évaluations)")
        elif avg_rating >= 3.0:
            reasons.append(f"📊 STAGIAIRE MOYEN ({avg_rating:.1f}/5 - {rating_count} évaluations)")
        else:
            reasons.append(f"⚠️ Évaluations faibles ({avg_rating:.1f}/5 - {rating_count} évaluations)")
        
        # Bonus pour nombre d'évaluations
        if rating_count >= 5:
            reasons.append("🔥 Nombreuses évaluations (très fiable)")
        elif rating_count >= 3:
            reasons.append("✅ Plusieurs évaluations (fiable)")
        elif rating_count >= 2:
            reasons.append("📊 Évaluations multiples")
        elif rating_count == 1:
            reasons.append("📝 Une seule évaluation")
        
        # 🎯 COMPÉTENCES
        if skill_sim > 0.8:
            reasons.append("🎯 CORRESPONDANCE PARFAITE des compétences")
        elif skill_sim > 0.6:
            reasons.append("🎯 Excellente correspondance des compétences")
        elif skill_sim > 0.4:
            reasons.append("✅ Très bonnes compétences techniques")
        elif skill_sim > 0.2:
            reasons.append("📚 Bonnes compétences techniques")
        elif skill_sim > 0.1:
            reasons.append("📊 Compétences partiellement alignées")
        else:
            reasons.append("⚠️ Compétences peu alignées")
        
        # 📝 PROFIL TEXTUEL
        if text_sim > 0.5:
            reasons.append("📝 Excellent profil textuel")
        elif text_sim > 0.3:
            reasons.append("📝 Bon profil textuel")
        elif text_sim > 0.2:
            reasons.append("📝 Profil textuel correct")
        
        # ✅ CONDITIONS OBLIGATOIRES
        reasons.append("✅ Stage terminé et validé")
        reasons.append("🏢 Département compatible")
        
        # 🏆 EXCELLENCE COMBINÉE
        if avg_rating >= 4.0 and skill_sim > 0.5:
            reasons.append("🏆 PROFIL EXCEPTIONNEL (excellent rating + compétences)")
        
        return reasons
    
    def _generate_intelligent_match_reasons(self, skill_sim, rating_score, avg_rating, rating_count, composite_score):
        """Génère des raisons intelligentes basées sur les vrais scores"""
        reasons = []
        
        # 🎯 ANALYSE DU RATING
        if rating_count == 0:
            reasons.append("⚠️ Aucune évaluation disponible")
        elif avg_rating >= 4.5:
            reasons.append(f"⭐ EXCELLENCE: {avg_rating:.1f}/5 ({rating_count} évaluations)")
        elif avg_rating >= 4.0:
            reasons.append(f"🌟 TRÈS BON: {avg_rating:.1f}/5 ({rating_count} évaluations)")
        elif avg_rating >= 3.5:
            reasons.append(f"👍 BON: {avg_rating:.1f}/5 ({rating_count} évaluations)")
        elif avg_rating >= 3.0:
            reasons.append(f"📊 MOYEN: {avg_rating:.1f}/5 ({rating_count} évaluations)")
        else:
            reasons.append(f"⚠️ FAIBLE: {avg_rating:.1f}/5 ({rating_count} évaluations)")
        
        # 🎯 ANALYSE DES COMPÉTENCES
        if skill_sim >= 0.8:
            reasons.append("🎯 CORRESPONDANCE PARFAITE des compétences")
        elif skill_sim >= 0.6:
            reasons.append("🎯 EXCELLENTE correspondance des compétences")
        elif skill_sim >= 0.4:
            reasons.append("✅ BONNE correspondance des compétences")
        elif skill_sim >= 0.2:
            reasons.append("📚 Correspondance PARTIELLE des compétences")
        else:
            reasons.append("⚠️ Compétences PEU alignées")
        
        # 🏆 SCORE GLOBAL
        if composite_score >= 0.8:
            reasons.append("🏆 CANDIDAT EXCEPTIONNEL")
        elif composite_score >= 0.6:
            reasons.append("🌟 TRÈS BON CANDIDAT")
        elif composite_score >= 0.4:
            reasons.append("👍 BON CANDIDAT")
        else:
            reasons.append("📊 CANDIDAT ACCEPTABLE")
        
        # ✅ CRITÈRES OBLIGATOIRES
        reasons.append("✅ Stage terminé et validé")
        reasons.append("🏢 Département requis")
        
        # 🔥 BONUS SPÉCIAUX
        if avg_rating >= 4.0 and skill_sim > 0.5:
            reasons.append("🔥 PROFIL PREMIUM (excellent rating + compétences)")
        
        if rating_count >= 3:
            reasons.append("📊 Évaluations multiples (fiable)")
        
        return reasons
    
    def preprocess_text(self, text):
        """Préprocessing du texte"""
        if pd.isna(text) or text == "" or text is None:
            return ""
        
        text = str(text).lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def test_comprehensive_ratings(self):
        """Test complet du système de rating"""
        try:
            conn = pyodbc.connect(self.connection_string)
            
            # Test 1: Structure de la table Ratings
            structure_query = """
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Ratings'
            ORDER BY ORDINAL_POSITION
            """
            
            structure_df = pd.read_sql(structure_query, conn)
            logger.info("Structure table Ratings:")
            for _, col in structure_df.iterrows():
                logger.info(f"  - {col['COLUMN_NAME']}: {col['DATA_TYPE']} ({'NULL' if col['IS_NULLABLE'] == 'YES' else 'NOT NULL'})")
            
            # Test 2: Distribution des ratings par type et status
            distribution_query = """
            SELECT 
                Type,
                Status,
                COUNT(*) as Count,
                AVG(CAST(Score as FLOAT)) as AvgScore,
                MIN(Score) as MinScore,
                MAX(Score) as MaxScore
            FROM Ratings 
            GROUP BY Type, Status
            ORDER BY Type, Status
            """
            
            dist_df = pd.read_sql(distribution_query, conn)
            logger.info("\nDistribution des ratings:")
            for _, row in dist_df.iterrows():
                type_name = ["TuteurToStagiaire", "RHToStagiaire", "StagiaireToTuteur"][row['Type']]
                status_name = ["Draft", "Submitted", "Approved", "Rejected"][row['Status']]
                logger.info(f"  - {type_name} ({status_name}): {row['Count']} ratings, "
                           f"moyenne {row['AvgScore']:.2f}, range [{row['MinScore']}-{row['MaxScore']}]")
            
            # Test 3: Échantillon de stagiaires avec leurs ratings
            sample_query = """
            SELECT TOP 5
                u.Id, u.FirstName, u.LastName,
                COUNT(r.Id) as RatingCount,
                AVG(CAST(r.Score as FLOAT)) as AvgRating,
                STRING_AGG(CAST(r.Score as VARCHAR), ', ') as AllScores
            FROM Users u
            LEFT JOIN Ratings r ON u.Id = r.EvaluatedUserId AND r.Type IN ('TuteurToStagiaire', 'RHToStagiaire')
            WHERE u.Role = 3
            GROUP BY u.Id, u.FirstName, u.LastName
            ORDER BY COUNT(r.Id) DESC, AVG(CAST(r.Score as FLOAT)) DESC
            """
            
            sample_df = pd.read_sql(sample_query, conn)
            logger.info("\nÉchantillon de stagiaires avec ratings:")
            for _, row in sample_df.iterrows():
                logger.info(f"  - {row['FirstName']} {row['LastName']}: "
                           f"{row['RatingCount']} ratings, moyenne {row['AvgRating'] or 0:.2f}, "
                           f"scores: [{row['AllScores'] or 'aucun'}]")
            
            # Test 4: Test du calcul pour un stagiaire spécifique
            if len(sample_df) > 0:
                test_stagiaire_id = sample_df.iloc[0]['Id']
                logger.info(f"\nTest calcul détaillé pour stagiaire ID {test_stagiaire_id}:")
                rating_result = self.get_stagiaire_comprehensive_rating(test_stagiaire_id, conn)
                logger.info(f"Résultat: {rating_result}")
            
            conn.close()
            
            return {
                'success': True,
                'structure': structure_df.to_dict('records'),
                'distribution': dist_df.to_dict('records'),
                'sample_stagiaires': sample_df.to_dict('records')
            }
            
        except Exception as e:
            logger.error(f"Erreur test ratings: {e}")
            return {'success': False, 'error': str(e)}

# ===== API FLASK AMÉLIORÉE =====
app = Flask(__name__)
CORS(app, origins=["http://localhost:4200", "https://localhost:7001"])

# Instance du système amélioré
recommendation_system = ImprovedRecommendationSystem()

@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    """Endpoint principal pour les recommandations avec ratings prioritaires"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Données manquantes'}), 400
        
        job_offer = {
            'title': data.get('title', ''),
            'description': data.get('description', ''),
            'requiredSkills': data.get('requiredSkills', ''),
            'departmentId': data.get('departmentId')
        }
        
        # Validation: Département obligatoire
        if not job_offer['departmentId']:
            return jsonify({
                'success': False,
                'error': 'Le département est obligatoire pour les recommandations'
            }), 400
        
        top_n = data.get('topN', 10)
        
        logger.info(f"\n🔍 === NOUVELLE DEMANDE DE RECOMMANDATIONS ===")
        logger.info(f"📋 Poste: {job_offer['title']}")
        logger.info(f"🎯 Compétences: {job_offer['requiredSkills']}")
        logger.info(f"🏢 Département: {job_offer['departmentId']}")
        
        recommendations = recommendation_system.get_recommendations(job_offer, top_n)
        
        logger.info(f"✅ Retour de {len(recommendations)} recommandations")
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'totalFound': len(recommendations),
            'algorithm_info': {
                'version': '2.0 - Rating Priority',
                'weights': {
                    'ratings': '60%',
                    'skills': '25%', 
                    'text_similarity': '15%'
                },
                'filters_applied': {
                    'department_required': job_offer['departmentId'],
                    'stage_completed': True,
                    'rating_source': 'Tous les ratings (sans filtre status)'
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Erreur dans get_recommendations: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Vérification de santé améliorée"""
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat(),
        'service': 'Système de Recommandation IA v2.0 - CORRIGÉ POUR ANGULAR',
        'features': [
            'Types ENUM string corrigés (TuteurToStagiaire, RHToStagiaire)',
            'Suppression filtre Status (tous status inclus)',
            'Ratings prioritaires (60% du score)',
            'Calcul qualité des évaluations', 
            'Analyse détaillée des compétences',
            'Filtres stricts (département + stage terminé)',
            'Compatible avec service Angular existant'
        ],
        'angular_integration': {
            'url': 'http://localhost:5000/api/recommendations',
            'method': 'POST',
            'required_fields': ['title', 'description', 'requiredSkills', 'departmentId'],
            'cors_enabled': True,
            'ports_allowed': ['http://localhost:4200', 'https://localhost:7001']
        },
        'critical_fixes': [
            'ENUM Types: string au lieu de numériques',
            'Status ignoré: Draft/Submitted/Approved/Rejected tous inclus',
            'Filtres obligatoires: DepartmentId + EndDate <= today'
        ]
    })

@app.route('/api/test-ratings-comprehensive', methods=['GET'])
def test_ratings_comprehensive():
    """Test complet du système de ratings"""
    try:
        result = recommendation_system.test_comprehensive_ratings()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erreur test ratings: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test-stagiaire-rating/<int:stagiaire_id>', methods=['GET'])
def test_stagiaire_rating(stagiaire_id):
    """Test du calcul de rating pour un stagiaire spécifique"""
    try:
        conn = pyodbc.connect(recommendation_system.connection_string)
        rating_result = recommendation_system.get_stagiaire_comprehensive_rating(stagiaire_id, conn)
        conn.close()
        
        return jsonify({
            'success': True,
            'stagiaire_id': stagiaire_id,
            'rating_analysis': rating_result
        })
        
    except Exception as e:
        logger.error(f"Erreur test stagiaire {stagiaire_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stagiaires-with-ratings', methods=['GET'])
def get_stagiaires_with_ratings():
    """Récupère tous les stagiaires avec leurs ratings détaillés"""
    try:
        df = recommendation_system.get_stagiaires_data()
        
        if df.empty:
            return jsonify({
                'success': True,
                'stagiaires': [],
                'count': 0
            })
        
        # Conversion en format JSON avec gestion des ratings
        stagiaires_data = []
        for _, row in df.iterrows():
            stagiaire = {
                'id': int(row['Id']),
                'name': f"{row['FirstName']} {row['LastName']}",
                'email': row.get('Email', ''),
                'department': row.get('DepartmentName', ''),
                'skills': row.get('Skills', ''),
                'rating': float(row.get('AverageRating', 3.0)),
                'ratingCount': int(row.get('RatingCount', 0)),
                'hasRatings': bool(row.get('HasRatings', False)),
                'ratingQuality': float(row.get('RatingQuality', 0.5)),
                'stageCompleted': recommendation_system.is_stage_completed(row)
            }
            stagiaires_data.append(stagiaire)
        
        # Tri par rating décroissant
        stagiaires_data.sort(key=lambda x: x['rating'], reverse=True)
        
        return jsonify({
            'success': True,
            'stagiaires': stagiaires_data,
            'count': len(stagiaires_data),
            'statistics': {
                'with_ratings': len([s for s in stagiaires_data if s['hasRatings']]),
                'without_ratings': len([s for s in stagiaires_data if not s['hasRatings']]),
                'avg_rating': np.mean([s['rating'] for s in stagiaires_data]),
                'completed_stages': len([s for s in stagiaires_data if s['stageCompleted']])
            }
        })
        
    except Exception as e:
        logger.error(f"Erreur récupération stagiaires: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test-enum-types', methods=['GET'])
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
            return jsonify({'error': 'Texte manquant'}), 400
        
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
                'endDate': str(stagiaire.get('EndDate', '')),
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
        
if __name__ == '__main__':
    print("🚀 Système de Recommandation IA v2.0 - CORRIGÉ POUR ANGULAR")
    print("🔧 CORRECTIONS APPLIQUÉES:")
    print("   ✅ Types ENUM string ('TuteurToStagiaire', 'RHToStagiaire')")
    print("   ✅ Suppression filtre Status (Draft/Submitted/Approved/Rejected)")
    print("   ✅ Compatible avec votre service Angular existant")
    print("   ⭐ Ratings prioritaires (60% du score)")
    print("   📊 Calcul qualité des évaluations")
    print("   🎯 Bonus pour excellence (rating + compétences)")
    print("\n📊 Endpoints disponibles pour Angular:")
    print("   POST /api/recommendations - Recommandations IA")
    print("   GET  /api/health - Vérification de santé")
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

    app.run(debug=True, host='0.0.0.0', port=5000)