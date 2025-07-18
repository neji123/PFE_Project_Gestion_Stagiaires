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
import re
import os

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
        """Vérifie si le stage est terminé"""
        try:
            end_date = stagiaire.get('EndDate')
            
            if not end_date or pd.isna(end_date):
                return False
            
            # Conversion en datetime
            if isinstance(end_date, str):
                try:
                    end_date_parsed = pd.to_datetime(end_date)
                except:
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
            return is_completed
                
        except Exception as e:
            logger.error(f"Erreur vérification stage: {e}")
            return True  # En cas d'erreur, considérer comme terminé
    
    def get_stagiaire_comprehensive_rating(self, stagiaire_id, conn):
        """Calcul amélioré des ratings - copié depuis app1.py qui fonctionne"""
        try:
            # Requête principale - Types ENUM STRING corrigés + sans filtre status
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
            AND r.Type IN ('TuteurToStagiaire', 'RHToStagiaire')
            ORDER BY r.CreatedAt DESC
            """
            
            ratings_df = pd.read_sql(rating_query, conn, params=[stagiaire_id])
            
            if len(ratings_df) == 0:
                return {
                    'average_rating': 3.0,
                    'rating_count': 0,
                    'detailed_scores': {},
                    'has_ratings': False,
                    'rating_details': []
                }
            
            # Analyse détaillée des ratings
            rating_details = []
            total_score_sum = 0
            valid_ratings_count = 0
            
            for _, rating in ratings_df.iterrows():
                try:
                    score = float(rating['Score'])
                    total_score_sum += score
                    valid_ratings_count += 1
                    
                    evaluator_type = "Tuteur" if rating['Type'] == 'TuteurToStagiaire' else "RH"
                    
                    rating_detail = {
                        'id': rating['Id'],
                        'score': score,
                        'evaluator_name': rating['EvaluatorName'],
                        'evaluator_type': evaluator_type,
                        'comment': rating['Comment'] or '',
                        'created_at': rating['CreatedAt'].strftime('%Y-%m-%d') if rating['CreatedAt'] else '',
                        'status': rating['Status']
                    }
                    
                    rating_details.append(rating_detail)
                    
                except Exception as e:
                    logger.error(f"Erreur traitement rating {rating['Id']}: {e}")
                    continue
            
            # Calcul des moyennes
            if valid_ratings_count == 0:
                average_rating = 3.0
            else:
                average_rating = total_score_sum / valid_ratings_count
            
            result = {
                'average_rating': round(average_rating, 2),
                'rating_count': valid_ratings_count,
                'detailed_scores': {},
                'has_ratings': valid_ratings_count > 0,
                'rating_details': rating_details,
                'quality_score': self._calculate_rating_quality(valid_ratings_count, average_rating)
            }
            
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
            return 0.3
        
        count_score = min(rating_count / 3, 1.0)
        rating_score = average_rating / 5.0
        quality_score = (count_score * 0.3) + (rating_score * 0.7)
        
        return round(quality_score, 3)
    
    def get_stagiaires_data(self):
        """Récupère les données des stagiaires avec ratings"""
        try:
            conn = pyodbc.connect(self.connection_string)
            
            # Requête de base pour les stagiaires
            base_query = """
            SELECT 
                Id, FirstName, LastName, Email, Skills, CvUrl,
                StartDate, EndDate, DepartmentId, Role, statuts,
                stage, etudiant, UniversityId
            FROM Users 
            WHERE Role = 3
            """
            
            df = pd.read_sql(base_query, conn)
            
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
                df['Universityname'] = 'Université inconnue'
            
            # Calcul des ratings
            for idx, row in df.iterrows():
                try:
                    rating_data = self.get_stagiaire_comprehensive_rating(row['Id'], conn)
                    
                    df.at[idx, 'AverageRating'] = rating_data['average_rating']
                    df.at[idx, 'RatingCount'] = rating_data['rating_count']
                    df.at[idx, 'HasRatings'] = rating_data['has_ratings']
                    df.at[idx, 'RatingQuality'] = rating_data['quality_score']
                    df.at[idx, 'DetailedScores'] = json.dumps(rating_data['detailed_scores'])
                    df.at[idx, 'RatingDetails'] = json.dumps(rating_data['rating_details'])
                except Exception as e:
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
            
            return df
            
        except Exception as e:
            logger.error(f"Erreur globale: {e}")
            return pd.DataFrame()
    
    def get_recommendations(self, job_offer, top_n=10):
        """Système de recommandations intelligent et strict"""
        try:
            logger.info(f"Démarrage recommandations pour: {job_offer.get('title', '')}")
            
            # Récupération des données
            stagiaires_df = self.get_stagiaires_data()
            if stagiaires_df.empty:
                return []
            
            # Filtre strict département (obligatoire)
            required_dept_id = job_offer.get('departmentId')
            if not required_dept_id:
                return []
                
            dept_mask = stagiaires_df['DepartmentId'] == int(required_dept_id)
            dept_filtered = stagiaires_df[dept_mask].copy()
            
            if dept_filtered.empty:
                return []
            
            # Filtre strict stages terminés
            eligible_stagiaires = []
            current_date = datetime.now()
            
            for idx, stagiaire in dept_filtered.iterrows():
                end_date_str = stagiaire.get('EndDate')
                
                if not end_date_str or pd.isna(end_date_str):
                    continue
                
                try:
                    end_date = pd.to_datetime(end_date_str)
                    if hasattr(end_date, 'iloc'):
                        end_date = end_date.iloc[0] if len(end_date) > 0 else end_date
                    
                    if end_date <= current_date:
                        eligible_stagiaires.append(stagiaire)
                        
                except Exception as e:
                    continue
            
            if not eligible_stagiaires:
                return []
            
            # Calcul intelligent des scores
            recommendations = []
            job_skills_required = job_offer.get('requiredSkills', '')
            
            for stagiaire in eligible_stagiaires:
                # Score de Rating (60% du score total)
                avg_rating = float(stagiaire.get('AverageRating', 3.0))
                rating_count = int(stagiaire.get('RatingCount', 0))
                has_ratings = bool(stagiaire.get('HasRatings', False))
                
                if has_ratings and rating_count > 0:
                    rating_score = avg_rating / 5.0
                    if rating_count >= 3:
                        rating_score *= 1.1
                    elif rating_count >= 2:
                        rating_score *= 1.05
                else:
                    rating_score = 0.4
                
                # Score de Compétences (30% du score total)
                stagiaire_skills = str(stagiaire.get('Skills', ''))
                
                if not stagiaire_skills or stagiaire_skills.lower() in ['none', 'null', '']:
                    skill_similarity = 0.1
                else:
                    skill_similarity = self.calculate_skill_similarity_improved(
                        job_skills_required, stagiaire_skills
                    )
                
                # Score Textuel (10% du score total)
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
                except:
                    text_similarity = 0.1
                
                # Score composite final
                composite_score = (rating_score * 0.6) + (skill_similarity * 0.3) + (text_similarity * 0.1)
                
                # Bonus pour excellence
                if avg_rating >= 4.0 and skill_similarity > 0.5:
                    composite_score += 0.15
                
                # Filtrage par seuil minimum
                if skill_similarity < 0.2 or composite_score < 0.3:
                    continue
                
                composite_score = min(composite_score, 1.0)
                
                # Construction de la recommandation
                recommendation = {
                    'stagiaireId': int(stagiaire['Id']),
                    'name': f"{stagiaire['FirstName']} {stagiaire['LastName']}",
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
                    'matchReasons': self._generate_match_reasons(
                        skill_similarity, rating_score, avg_rating, rating_count, composite_score
                    ),
                    'detailedScores': json.loads(stagiaire.get('DetailedScores', '{}')),
                    'ratingDetails': json.loads(stagiaire.get('RatingDetails', '[]'))
                }
                
                recommendations.append(recommendation)
            
            # Tri et finalisation
            recommendations.sort(key=lambda x: x['compositeScore'], reverse=True)
            return recommendations[:top_n]
            
        except Exception as e:
            logger.error(f"Erreur critique dans get_recommendations: {e}")
            return []
    
    def _generate_match_reasons(self, skill_similarity, rating_score, avg_rating, rating_count, composite_score):
        """Génère des raisons intelligentes pour le match"""
        reasons = []
        
        if rating_count == 0:
            reasons.append("⚠️ Aucune évaluation disponible")
        elif avg_rating >= 4.5:
            reasons.append(f"⭐ EXCELLENT STAGIAIRE ({avg_rating:.1f}/5)")
        elif avg_rating >= 4.0:
            reasons.append(f"🌟 TRÈS BON STAGIAIRE ({avg_rating:.1f}/5)")
        elif avg_rating >= 3.5:
            reasons.append(f"👍 BON STAGIAIRE ({avg_rating:.1f}/5)")
        else:
            reasons.append(f"📊 STAGIAIRE MOYEN ({avg_rating:.1f}/5)")
        
        if skill_similarity > 0.8:
            reasons.append("🎯 CORRESPONDANCE PARFAITE des compétences")
        elif skill_similarity > 0.6:
            reasons.append("🎯 Excellente correspondance des compétences")
        elif skill_similarity > 0.4:
            reasons.append("✅ Bonnes compétences techniques")
        elif skill_similarity > 0.2:
            reasons.append("📚 Compétences partiellement alignées")
        else:
            reasons.append("⚠️ Compétences peu alignées")
        
        if rating_count >= 3:
            reasons.append("📊 Évaluations multiples (fiable)")
        
        reasons.append("✅ Stage terminé et validé")
        reasons.append("🏢 Département compatible")
        
        if avg_rating >= 4.0 and skill_similarity > 0.5:
            reasons.append("🏆 PROFIL EXCEPTIONNEL")
        
        return reasons
    
    def preprocess_text(self, text):
        """Préprocessing du texte"""
        if pd.isna(text) or text == "" or text is None:
            return ""
        
        text = str(text).lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()


# Initialisation Flask
app = Flask(__name__)
CORS(app, origins=["http://localhost:4200", "https://localhost:7001"])

# Initialisation du système de recommandation
try:
    logger.info("🚀 Initialisation du système de recommandation...")
    recommendation_system = ImprovedRecommendationSystem()
    logger.info("✅ Système de recommandation initialisé avec succès")
except Exception as e:
    logger.error(f"❌ Erreur initialisation système: {e}")
    recommendation_system = None

# 📋 ENDPOINT PRINCIPAL DE RECOMMANDATION
@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    """Endpoint principal pour les recommandations"""
    try:
        if recommendation_system is None:
            return jsonify({
                'success': False,
                'error': 'Système de recommandation non disponible',
                'recommendations': []
            }), 503
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Données JSON manquantes'}), 400
        
        # Validation des champs obligatoires
        if 'departmentId' not in data:
            return jsonify({'error': 'Champ departmentId obligatoire'}), 400
        
        job_offer = {
            'title': data.get('title', ''),
            'description': data.get('description', ''),
            'requiredSkills': data.get('requiredSkills', ''),
            'departmentId': data.get('departmentId')
        }
        
        top_n = data.get('topN', 10)
        
        logger.info(f"Nouvelle demande de recommandations - Poste: {job_offer['title']}, Département: {job_offer['departmentId']}")
        
        recommendations = recommendation_system.get_recommendations(job_offer, top_n)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'totalFound': len(recommendations),
            'algorithm_info': {
                'version': '2.0 - Rating Priority',
                'weights': {
                    'ratings': '60%',
                    'skills': '30%', 
                    'text_similarity': '10%'
                },
                'filters_applied': {
                    'department_required': job_offer['departmentId'],
                    'stage_completed': True
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Erreur dans get_recommendations: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'recommendations': []
        }), 500

# 🏥 ENDPOINT DE SANTÉ
@app.route('/api/health', methods=['GET'])
def health_check():
    """Vérification de santé du service"""
    try:
        # Test de connexion à la base
        server = os.getenv('DB_SERVER', 'DESKTOP-913R9GN')
        database = os.getenv('DB_NAME', 'PFEDb')
        
        connection_string = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={server};"
            f"DATABASE={database};"
            f"Trusted_Connection=yes;"
        )
        
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM Users WHERE Role = 3")
        stagiaires_count = cursor.fetchone()[0]
        
        # Test des ratings
        cursor.execute("SELECT COUNT(*) FROM Ratings WHERE Type IN ('TuteurToStagiaire', 'RHToStagiaire')")
        ratings_count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'service': 'Système de Recommandation IA v2.0 - SIMPLIFIÉ',
            'database_connection': 'OK',
            'stagiaires_count': stagiaires_count,
            'ratings_count': ratings_count,
            'system_ready': recommendation_system is not None,
            'features': [
                'Types ENUM string corrigés',
                'Ratings prioritaires (60% du score)',
                'Filtres stricts (département + stage terminé)',
                'Compatible Angular'
            ]
        })
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


if __name__ == '__main__':
    print("🚀 Système de Recommandation IA v2.0 - VERSION SIMPLIFIÉE")
    print("📋 ENDPOINTS DISPONIBLES:")
    print("   POST /api/recommendations - Recommandations intelligentes")
    print("   GET  /api/health - Vérification de santé")
    print(f"\n⚙️ Configuration: {os.getenv('DB_SERVER', 'DESKTOP-913R9GN')} / {os.getenv('DB_NAME', 'PFEDb')}")
    print("🔧 PRÊT POUR ANGULAR - Utilisez http://localhost:5000/api/recommendations")
    print("\n🎯 POUR VOTRE SERVICE ANGULAR:")
    print("   - URL: http://localhost:5000/api/recommendations")
    print("   - Méthode: POST")
    print("   - Body: { title, description, requiredSkills, departmentId }")
    print("   - departmentId OBLIGATOIRE !")

    app.run(debug=True, host='0.0.0.0', port=5000)
