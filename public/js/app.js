import { utilsObj } from "./utilsObj.js";
import { userData } from './data.js';
import { components } from './components.js';

export class App {
    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        
        // Only initialize if we're not on login or register page
        const currentPath = window.location.pathname;
        if (currentPath !== '/login.html' && currentPath !== '/register.html') {
            this.init();
        }
    }

    async init() {
        if (!this.accessToken) {
            if ((window.location.pathname !== '/login.html') && (window.location.pathname !== '/register.html')) {
                window.location.href = '/login.html';
            }
            console.log("no accessToken")
            return;
        }
        try {
            await Promise.all([
                this.fetchUserLibrary(),
                this.fetchInfo(),
                this.fetchRecommendations()
            ]);
            this.loadLibrary();
            this.loadCurrentReading();
            this.loadInfo();
            this.loadRecommendations();
            this.setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            // If there's an auth error during initialization, redirect to login
            if (error.status === 401) {
                window.location.href = '/login.html';
            }
        }
    }

    // user login
    async login(username, password) {
        try {
            console.log("Attempting login with username:", username);
            const response = await fetch('/api/user/login', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error("Login failed: ", data.message);
                alert(`Login failed: ${data.message}`);
                return;
            }
            
            console.log("Login successful: ", data);
            
            // save tokens to client
            this.accessToken = data.accessToken;
            this.refreshToken = data.refreshToken;
            localStorage.setItem('accessToken', this.accessToken);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Redirect to home page after successful login
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Error during login request:', error);
            alert('An error occurred. Please try again.');
        }
    }

    // user register
    async register(username, password) {
        try {
            console.log("Attempting registration with username:", username);
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
    
            const data = await response.json();
            
            if (!response.ok) {
                console.error('Registration failed:', data.message);
                alert(`Registration failed: ${data.message}`);
                return;
            }
    
            console.log('Registration successful:', data);
            // After successful registration, automatically log in
            await this.login(username, password);
        } catch (error) {
            console.error('Error during registration:', error);
            alert('An error occurred during registration. Please try again.');
        }
    }
    
    // user logout
    async logout() {
        try {
            const response = await utilsObj.fetchWithAuth('/api/user/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: this.refreshToken })
            })
    
            if (!response.ok) {
                throw new Error('Logout failed')
            }

            // Clear tokens from localStorage
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            this.accessToken = null
            this.refreshToken = null
    
            // Redirect to login page
            window.location.href = '../login.html'
        } catch (error) {
            console.error('Error during logout:', error)
            alert('Logout failed. Please try again.')
        }
    }


    
    // fetch books in library and store in userData
    async fetchUserLibrary() {
        try {
            const response = await utilsObj.fetchWithAuth('/api/books/library');
            if (!response) return;
            console.log("Data has been fetched");
            const books = await response.json();
            console.log("Received books data:", books);
            console.log("Type of books:", typeof books);
            console.log("Is array:", Array.isArray(books));
            
            if (!Array.isArray(books)) {
                console.error('Expected books to be an array but got:', typeof books);
                return;
            }
            
            userData.library = books;    
            console.log("Data has been set to userData.library");
        } catch (error) {
            console.error('Error fetching library:', error);
        }
    }

    // TODO: fetch info. 
    // If info is not personal, then hard coding is acceptable. Can store in database or not.
    async fetchInfo() {

    }

    // TODO: fetch recommendations. 
    // recommend books in database, or outside, or both?
    // recommendation algo is tricky, maybe use a simple approach
    async fetchRecommendations() {

    }

    // search book
    async performSearch(searchTerm) {
        if (!searchTerm.trim()) {
            return;
        }

        try {
            const response = await utilsObj.fetchWithAuth(`/api/books/search?term=${encodeURIComponent(searchTerm)}`);
            if (!response) return;
            
            const results = await response.json();
            this.showSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    showSearchResults(results) {
        const contentScrollable = document.querySelector('.content-scrollable');
        const currentReading = document.querySelector('.current-reading');
        const library = document.querySelector('.library');
        
        // 移除已存在的搜索结果
        const existingSearchResults = document.querySelector('.search-results');
        if (existingSearchResults) {
            existingSearchResults.remove();
        }
        
        // 创建搜索结果容器
        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        
        // 添加搜索结果内容
        searchResults.innerHTML = `
            <div class="section-header">
                <div class="section-title">Search Results</div>
                <button class="back-to-library">Back to Library</button>
            </div>
            <div class="personal-results">
                <div class="section-header">
                    <div class="section-title">From Your Library</div>
                </div>
                <div class="books-grid">
                    ${results.personalResults.map(book => components.renderBookCard(book)).join('')}
                </div>
            </div>
            <div class="general-results">
                <div class="section-header">
                    <div class="section-title">More Books</div>
                </div>
                <div class="books-grid">
                    ${results.generalResults.map(book => components.renderBookCard(book)).join('')}
                </div>
            </div>
        `;
    
        // 隐藏当前阅读和图书馆部分
        currentReading.style.display = 'none';
        library.style.display = 'none';
        
        // 添加搜索结果到页面
        contentScrollable.appendChild(searchResults);
    
        // 添加返回按钮事件监听器
        searchResults.querySelector('.back-to-library').addEventListener('click', () => {
            // 移除搜索结果
            searchResults.remove();
            
            // 重新显示当前阅读和图书馆部分
            currentReading.style.display = '';
            library.style.display = '';
        });
    }

    loadLibrary() {
        const container = document.getElementById('libraryContainer');
        container.innerHTML = userData.library
            .map(book => components.renderBookCard(book))
            .join('');
    }

    loadCurrentReading() {
        const container = document.getElementById('currentReadingContainer');
        const currentReading = userData.library.filter(book => book.status === 'In Progress');
        container.innerHTML = currentReading
            .map(book => components.renderCurrentReading(book))
            .join('');
    }

    loadInfo() {
        const container = document.getElementById('infoContainer');
        container.innerHTML = userData.info
            .map(info => components.renderInfoItem(info))
            .join('');
    }
    
    loadRecommendations() {
        const container = document.getElementById('recommendationsContainer');
        container.innerHTML = userData.recommendations
            .map(book => components.renderBookCard(book))
            .join('');
    }

    setupEventListeners() {
        // sidebar toggle event listener
        const menuToggle = document.querySelector('.menu-toggle-button');
        const columnRight = document.querySelector('.column-right');
        
        menuToggle?.addEventListener('click', () => {
            columnRight.classList.toggle('active');
            if (window.innerWidth <= 768) {
                document.body.style.overflow = columnRight.classList.contains('active') ? 'hidden' : 'auto';
            }
        });
        // go to book page by clicking book-card or current-reading-card
        document.addEventListener('click', (e) => {
            const bookCard = e.target.closest('.book-card, .current-reading-card');
            if (bookCard) {
                const bookId = bookCard.dataset.bookId;
                window.location.href = `/book.html?id=${bookId}`;
            }
        });

        // search
        const searchInput = document.querySelector('.search-bar input');
        const searchButton = document.querySelector('.search-button');

        // 回车触发搜索
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.performSearch(searchInput.value);
            }
        });

        // 点击按钮触发搜索
        searchButton.addEventListener('click', () => {
            this.performSearch(searchInput.value);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});