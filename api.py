import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import logging

logger = logging.getLogger(__name__)

def create_app(news_repository, sources_repository, user_filters_repository):
    app = Flask(__name__)
    
    # ✅ ВКЛЮЧАЕМ CORS ДЛЯ ВСЕХ ДОМЕНОВ
    CORS(app)
    
    WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web')
    WEB_DIR = os.path.abspath(WEB_DIR)
    
    print(f"📁 WEB_DIR: {WEB_DIR}")

    # ✅ ТЕСТОВЫЙ ENDPOINT
    @app.route('/api/')
    def api_index():
        """Главная страница API"""
        return jsonify({
            'message': '🚀 FilterINFO API is running!',
            'endpoints': {
                '/api/news': 'Get news',
                '/api/stats': 'Get statistics', 
                '/api/categories': 'Get categories',
                '/api/sources': 'Get sources',
                '/api/filters/<user_id>': 'Get/save user filters'
            }
        })
    
    @app.route('/api/stats')
    def api_stats():
        """API для статистики"""
        try:
            sources = sources_repository.get_all_sources()
            return jsonify({
                'total_news': news_repository.get_news_count(),
                'sources_count': len(sources),
                'update_interval': '2 минуты'
            })
        except Exception as e:
            logger.error(f"Ошибка в /api/stats: {e}")
            return jsonify({'error': 'Ошибка загрузки статистики'}), 500
    
    @app.route('/api/news')
    def api_news():
        """API для получения новостей"""
        try:
            news = news_repository.get_news(50)  # Увеличил лимит для тестирования
            for item in news:
                # Возвращаем время в UTC
                item['time_utc'] = item.get('published_at') or item.get('created_at')
                item['has_exact_time'] = bool(item.get('published_at'))
                # Добавляем категорию если есть
                if 'category' not in item:
                    item['category'] = 'разное'

            return jsonify(news)
        except Exception as e:
            logger.error(f"Ошибка в /api/news: {e}")
            return jsonify({'error': 'Ошибка загрузки новостей', 'details': str(e)}), 500
    
    @app.route('/api/sources')
    def api_sources():
        """API для списка источников"""
        try:
            sources = sources_repository.get_all_sources()
            sources_list = [{'name': source['name'], 'url': source['url'], 'category': source['category_name']} 
                           for source in sources]
            return jsonify(sources_list)
        except Exception as e:
            logger.error(f"Ошибка в /api/sources: {e}")
            return jsonify({'error': 'Ошибка загрузки источников'}), 500
    
    @app.route('/api/categories')
    def api_categories():
        """API для получения категорий"""
        try:
            categories = sources_repository.get_sources_by_category()
            return jsonify(categories)
        except Exception as e:
            logger.error(f"Ошибка в /api/categories: {e}")
            return jsonify({'error': 'Ошибка загрузки категорий'}), 500
    
    # ✅ НОВЫЙ ENDPOINT ДЛЯ ФИЛЬТРОВ
    @app.route('/api/filters/<int:user_id>', methods=['GET', 'POST'])
    def api_user_filters(user_id):
        """API для работы с фильтрами пользователя"""
        try:
            if request.method == 'GET':
                # Получить фильтры из БД
                filters = user_filters_repository.get_user_filters(user_id)
                return jsonify(filters)
            
            elif request.method == 'POST':
                # Сохранить фильтры в БД
                filters = request.get_json()
                user_filters_repository.save_user_filters(user_id, filters)
                return jsonify({'status': 'success'})
                
        except Exception as e:
            logger.error(f"Ошибка в /api/filters: {e}")
            return jsonify({'error': 'Ошибка работы с фильтрами'}), 500
    
    # ✅ ДОПОЛНИТЕЛЬНЫЙ ENDPOINT ДЛЯ ТЕСТИРОВАНИЯ
    @app.route('/api/debug')
    def api_debug():
        """Debug endpoint для проверки работы API"""
        try:
            news_count = news_repository.get_news_count()
            sources_count = len(sources_repository.get_all_sources())
            categories_count = len(sources_repository.get_sources_by_category())
            
            return jsonify({
                'status': 'ok',
                'news_count': news_count,
                'sources_count': sources_count,
                'categories_count': categories_count,
                'message': 'API работает корректно'
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # Static files routes
    @app.route('/')
    def index():
        return "🚀 FilterINFO API Server is running! Use /web/ for web app or /api/ for API."
    
    @app.route('/web/')
    @app.route('/web/index.html')
    def web_index():
        """Serve main webapp"""
        try:
            return send_from_directory(WEB_DIR, 'index.html')
        except Exception as e:
            return f"Error: {e}", 404
    
    @app.route('/web/<path:filename>')
    def serve_web_files(filename):
        """Serve static files from web directory"""
        try:
            return send_from_directory(WEB_DIR, filename)
        except Exception as e:
            return f"File {filename} not found", 404
    
    return app

def run_flask(app):
    print("🌐 Starting Flask server on port 8080...")
    app.run(host='0.0.0.0', port=8080, debug=False, use_reloader=False)
