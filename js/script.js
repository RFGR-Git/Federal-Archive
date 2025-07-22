import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase variables (provided by Canvas environment)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserId = null; // To store the authenticated user's ID

// Authenticate user: This listener updates currentUserId based on auth state.
// It does NOT force anonymous sign-in here to allow the admin login flow to work.
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Authenticated user:", currentUserId);
    } else {
        currentUserId = null; // Clear user ID if logged out
        console.log("User logged out or not authenticated.");
    }
    // Dispatch event for main script to react to auth state changes
    document.dispatchEvent(new CustomEvent('firebaseAuthReady', { detail: { db, auth, currentUserId, appId } }));
});

// Expose Firebase objects to the global scope for use in other scripts
window.firebase = {
    db,
    auth,
    appId,
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    signInWithEmailAndPassword, // Expose for admin login
    signOut, // Expose for admin logout
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where
};

// Function to show custom message box - Exposed to window
window.showMessageBox = function(message) {
    const msgBox = document.getElementById('message-box');
    const msgText = document.getElementById('message-text');
    msgText.textContent = message;
    msgBox.classList.remove('hidden');
    setTimeout(() => {
        msgBox.classList.add('hidden');
    }, 3000); // Hide after 3 seconds
}

// Document Detail Modal Functions - Exposed to window
const detailModal = document.getElementById('document-detail-modal');
const detailTitle = document.getElementById('detail-title');
const detailContent = document.getElementById('detail-content');
const viewDocumentExternalButton = document.getElementById('view-document-external');

window.showDocumentDetail = function(documentData) {
    detailTitle.textContent = documentData.title;
    let contentHtml = '';

    switch (documentData.type) {
        case 'federal-law':
            contentHtml = `
                <p><strong>Date Enacted:</strong> ${documentData.dateEnacted}</p>
                <p><strong>Issuing Authority:</strong> ${documentData.issuingAuthority}</p>
                <p><strong>Status:</strong> ${documentData.status}</p>
                <p><strong>Code Title:</strong> ${documentData.codeTitle}</p>
                <p><strong>Summary:</strong> ${documentData.summary}</p>
                <p><strong>Tags:</strong> ${documentData.tags}</p>
            `;
            break;
        case 'executive-document':
            contentHtml = `
                <p><strong>Issuing Authority:</strong> ${documentData.issuingAuthority}</p>
                <p><strong>Date Issued:</strong> ${documentData.dateIssued}</p>
                <p><strong>Document Type:</strong> ${documentData.documentType}</p>
                <p><strong>Summary:</strong> ${documentData.summary}</p>
                <p><strong>Status:</strong> ${documentData.status}</p>
            `;
            break;
        case 'judicial-document':
            contentHtml = `
                <p><strong>Court:</strong> ${documentData.court}</p>
                <p><strong>Date Issued:</strong> ${documentData.dateIssued}</p>
                <p><strong>Judge / Prosecutor:</strong> ${documentData.judgeProsecutor}</p>
                <p><strong>Case Type:</strong> ${documentData.caseType}</p>
                <p><strong>Summary:</strong> ${documentData.summary}</p>
                <p><strong>Status:</strong> ${documentData.status}</p>
            `;
            break;
        case 'treaty-resolution':
            contentHtml = `
                <p><strong>Document Type:</strong> ${documentData.documentType}</p>
                <p><strong>Date Signed / Adopted:</strong> ${documentData.dateSignedAdopted}</p>
                <p><strong>Status:</strong> ${documentData.status}</p>
                <p><strong>Parties Involved:</strong> ${documentData.partiesInvolved}</p>
                <p><strong>Summary:</strong> ${documentData.summary}</p>
            `;
            break;
    }
    detailContent.innerHTML = contentHtml;
    viewDocumentExternalButton.onclick = () => window.showMessageBox(`Opening external document for: ${documentData.title}`);
    detailModal.style.display = 'flex'; // Show the modal
}

window.hideDocumentDetail = function() {
    detailModal.style.display = 'none'; // Hide the modal
}

// Function to render content based on category
async function renderContent(category) {
    const mainContentDiv = document.getElementById('main-content');
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    let contentHtml = '';
    let breadcrumbText = '';

    // Helper function to generate search results HTML
    function generateSearchResultsHtml(documents) {
        if (documents.length === 0) {
            return '<p class="text-gray-400">No documents found for this category. Add some via the Admin Panel!</p>';
        }
        return `
            <div class="space-y-4">
                ${documents.map(doc => `
                    <div class="bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 cursor-pointer document-card" data-doc-id="${doc.id}">
                        <h4 class="text-lg font-semibold text-blue-400">${doc.title}</h4>
                        ${doc.type === 'federal-law' ? `<p class="text-sm text-gray-400">Enactment Date: ${doc.dateEnacted}</p>` : ''}
                        ${doc.type === 'executive-document' ? `<p class="text-sm text-gray-400">Issuing Authority: ${doc.issuingAuthority} | Date: ${doc.dateIssued}</p>` : ''}
                        ${doc.type === 'judicial-document' ? `<p class="text-sm text-gray-400">Court: ${doc.court} | Date: ${doc.dateIssued}</p>` : ''}
                        ${doc.type === 'treaty-resolution' ? `<p class="text-sm text-gray-400">Type: ${doc.documentType} | Date: ${doc.dateSignedAdopted} | Status: ${doc.status}</p>` : ''}
                        <p class="text-gray-300 line-clamp-2">Summary: ${doc.summary}</p>
                    </div>
                `).join('')}
            </div>
            <div class="mt-6 flex justify-center">
                <button class="py-2 px-4 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">Load More</button>
            </div>
        `;
    }

    switch (category) {
        case 'federal-laws':
            breadcrumbText = 'Federal Laws';
            contentHtml = `
                <h2 class="text-3xl font-bold mb-6 text-blue-400">Search Federal Laws</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label for="law-title-filter" class="block text-sm font-medium text-gray-300 mb-1">Code Title</label>
                        <select id="law-title-filter" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Title</option>
                            <option value="title1">Title 1</option>
                            <option value="title2">Title 2 - Criminal Law</option>
                            <option value="title3">Title 3</option>
                            <option value="title4">Title 4</option>
                            <option value="title5">Title 5</option>
                            <option value="title6">Title 6</option>
                            <option value="title7">Title 7</option>
                            <option value="title8">Title 8</option>
                        </select>
                    </div>
                    <div>
                        <label for="law-status-filter" class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select id="law-status-filter" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Status</option>
                            <option value="active">Active</option>
                            <option value="repealed">Repealed</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div>
                        <label for="law-year-from" class="block text-sm font-medium text-gray-300 mb-1">Year Range (From)</label>
                        <input type="number" id="law-year-from" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="law-year-to" class="block text-sm font-medium text-gray-300 mb-1">Year Range (To)</label>
                        <input type="number" id="law-year-to" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="law-keywords-filter" class="block text-sm font-medium text-gray-300 mb-1">Keywords / Title / Bill Number</label>
                        <input type="text" id="law-keywords-filter" placeholder="e.g., environmental, bill 123" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="law-sponsor-filter" class="block text-sm font-medium text-gray-300 mb-1">Sponsor / Author</label>
                        <input type="text" id="law-sponsor-filter" placeholder="e.g., Ivanov" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <button id="search-federal-laws" class="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">Search Laws</button>
                    <button id="clear-federal-laws" class="flex-1 py-3 px-6 bg-gray-600 text-white font-semibold rounded-md shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200">Clear Filters</button>
                </div>

                <div class="mt-10">
                    <h3 class="text-2xl font-bold mb-4 text-blue-300">Search Results</h3>
                    <div id="federal-laws-results">Loading results...</div>
                </div>
            `;
            break;
        case 'executive-documents':
            breadcrumbText = 'Executive Documents';
            contentHtml = `
                <h2 class="text-3xl font-bold mb-6 text-blue-400">Search Executive Documents</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label for="executive-authority-filter" class="block text-sm font-medium text-gray-300 mb-1">Issuing Authority</label>
                        <select id="executive-authority-filter" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Authority</option>
                            <option value="president">President</option>
                            <option value="justice-ministry">Ministry of Justice</option>
                            <option value="finance-ministry">Ministry of Finance</option>
                            <option value="digital-development-ministry">Ministry of Digital Development</option>
                        </select>
                    </div>
                    <div>
                        <label for="executive-type-filter" class="block text-sm font-medium text-gray-300 mb-1">Document Type</label>
                        <select id="executive-type-filter" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Type</option>
                            <option value="order">Order</option>
                            <option value="decree">Decree</option>
                            <option value="instruction">Instruction</option>
                        </select>
                    </div>
                    <div>
                        <label for="executive-year-from" class="block text-sm font-medium text-gray-300 mb-1">Year Range (From)</label>
                        <input type="number" id="executive-year-from" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="executive-year-to" class="block text-sm font-medium text-gray-300 mb-1">Year Range (To)</label>
                        <input type="number" id="executive-year-to" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label for="executive-keywords-filter" class="block text-sm font-medium text-gray-300 mb-1">Keywords / Title / Document ID</label>
                        <input type="text" id="executive-keywords-filter" placeholder="e.g., economic stimulus, ID 456" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <button id="search-executive-docs" class="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">Search Executive Docs</button>
                    <button id="clear-executive-docs" class="flex-1 py-3 px-6 bg-gray-600 text-white font-semibold rounded-md shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200">Clear Filters</button>
                </div>

                <div class="mt-10">
                    <h3 class="text-2xl font-bold mb-4 text-blue-300">Search Results</h3>
                    <div id="executive-documents-results">Loading results...</div>
                </div>
            `;
            break;
        case 'judicial-documents':
            breadcrumbText = 'Judicial Documents';
            contentHtml = `
                <h2 class="text-3xl font-bold mb-6 text-blue-400">Search Judicial Documents</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label for="judicial-court-filter" class="block text-sm font-medium text-gray-300 mb-1">Court</label>
                        <select id="judicial-court-filter" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Court</option>
                            <option value="supreme">Supreme Court</option>
                            <option value="regional">Regional Courts</option>
                            <option value="arbitration">Arbitration Courts</option>
                        </select>
                    </div>
                    <div>
                        <label for="judicial-judge-filter" class="block text-sm font-medium text-gray-300 mb-1">Judge / Prosecutor</label>
                        <input type="text" id="judicial-judge-filter" placeholder="e.g., Petrov, Sidorova" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="judicial-case-type-filter" class="block text-sm font-medium text-gray-300 mb-1">Case Type</label>
                        <select id="judicial-case-type-filter" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Case Type</option>
                            <option value="criminal">Criminal</option>
                            <option value="civil">Civil</option>
                            <option value="administrative">Administrative</option>
                        </select>
                    </div>
                    <div>
                        <label for="judicial-year-from" class="block text-sm font-medium text-gray-300 mb-1">Year Range (From)</label>
                        <input type="number" id="judicial-year-from" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="judicial-year-to" class="block text-sm font-medium text-gray-300 mb-1">Year Range (To)</label>
                        <input type="number" id="judicial-year-to" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label for="judicial-keywords-filter" class="block text-sm font-medium text-gray-300 mb-1">Keywords / Case Number</label>
                        <input type="text" id="judicial-keywords-filter" placeholder="e.g., property dispute, case 123/2024" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <button id="search-judicial-docs" class="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">Search Judicial Docs</button>
                    <button id="clear-judicial-docs" class="flex-1 py-3 px-6 bg-gray-600 text-white font-semibold rounded-md shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200">Clear Filters</button>
                </div>

                <div class="mt-10">
                    <h3 class="text-2xl font-bold mb-4 text-blue-300">Search Results</h3>
                    <div id="judicial-documents-results">Loading results...</div>
                </div>
            `;
            break;
        case 'treaties-resolutions':
            breadcrumbText = 'Treaties & Resolutions';
            contentHtml = `
                <h2 class="text-3xl font-bold mb-6 text-blue-400">Search Treaties & Resolutions</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label for="treaty-type-filter" class="block text-sm font-medium text-gray-300 mb-1">Document Type</label>
                        <select id="treaty-type-filter" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Type</option>
                            <option value="treaty">Treaty</option>
                            <option value="resolution">Resolution</option>
                        </select>
                    </div>
                    <div>
                        <label for="treaty-status-filter" class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select id="treaty-status-filter" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select Status</option>
                            <option value="active">Active</option>
                            <option value="superseded">Superseded</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div>
                        <label for="treaty-year-from" class="block text-sm font-medium text-gray-300 mb-1">Year Range (From)</label>
                        <input type="number" id="treaty-year-from" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="treaty-year-to" class="block text-sm font-medium text-gray-300 mb-1">Year Range (To)</label>
                        <input type="number" id="treaty-year-to" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="treaty-parties-filter" class="block text-sm font-medium text-gray-300 mb-1">Parties Involved</label>
                        <input type="text" id="treaty-parties-filter" placeholder="e.g., Russia, UN, USA" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="treaty-title-number-filter" class="block text-sm font-medium text-gray-300 mb-1">Title / Number</label>
                        <input type="text" id="treaty-title-number-filter" placeholder="e.g., Climate Agreement, Resolution 789" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label for="treaty-keywords-filter" class="block text-sm font-medium text-gray-300 mb-1">Keywords / Topics</label>
                        <input type="text" id="treaty-keywords-filter" placeholder="e.g., human rights, trade" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <button id="search-treaties-resolutions" class="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">Search Treaties & Resolutions</button>
                    <button id="clear-treaties-resolutions" class="flex-1 py-3 px-6 bg-gray-600 text-white font-semibold rounded-md shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200">Clear Filters</button>
                </div>

                <div class="mt-10">
                    <h3 class="text-2xl font-bold mb-4 text-blue-300">Search Results</h3>
                    <div id="treaties-resolutions-results">Loading results...</div>
                </div>
            `;
            break;
        case 'advanced-search':
            breadcrumbText = 'Advanced Search';
            contentHtml = `
                <h2 class="text-3xl font-bold mb-6 text-blue-400">Advanced Search Across All Archives</h2>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Document Type(s)</label>
                    <div class="flex flex-wrap gap-4">
                        <label class="flex items-center">
                            <input type="checkbox" name="doc-type" value="federal-law" class="form-checkbox h-5 w-5 text-blue-600 rounded">
                            <span class="ml-2 text-gray-300">Federal Laws</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="doc-type" value="executive-document" class="form-checkbox h-5 w-5 text-blue-600 rounded">
                            <span class="ml-2 text-gray-300">Executive Documents</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="doc-type" value="judicial-document" class="form-checkbox h-5 w-5 text-blue-600 rounded">
                            <span class="ml-2 text-gray-300">Judicial Documents</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="doc-type" value="treaty-resolution" class="form-checkbox h-5 w-5 text-blue-600 rounded">
                            <span class="ml-2 text-gray-300">Treaties & Resolutions</span>
                        </label>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label for="advanced-keywords-filter" class="block text-sm font-medium text-gray-300 mb-1">Keywords / Full Text</label>
                        <input type="text" id="advanced-keywords-filter" placeholder="Global keyword search" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="advanced-year-from" class="block text-sm font-medium text-gray-300 mb-1">Date Range (From)</label>
                        <input type="number" id="advanced-year-from" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="advanced-year-to" class="block text-sm font-medium text-gray-300 mb-1">Year Range (To)</label>
                        <input type="number" id="advanced-year-to" placeholder="YYYY" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <button id="perform-advanced-search" class="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">Perform Advanced Search</button>
                    <button id="clear-advanced-search" class="flex-1 py-3 px-6 bg-gray-600 text-white font-semibold rounded-md shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200">Clear Filters</button>
                </div>

                <div class="mt-10">
                    <h3 class="text-2xl font-bold mb-4 text-blue-300">Search Results</h3>
                    <div id="advanced-search-results">Loading results...</div>
                </div>
            `;
            break;
        case 'admin-panel':
            // Check if authenticated AND NOT anonymous. If not, show login form.
            if (!auth.currentUser || auth.currentUser.isAnonymous) {
                breadcrumbText = 'Admin Login';
                contentHtml = `
                    <h2 class="text-3xl font-bold mb-6 text-blue-400">Admin Login</h2>
                    <div class="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto">
                        <form id="admin-login-form" class="space-y-4">
                            <div>
                                <label for="admin-email" class="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                <input type="email" id="admin-email" placeholder="admin@example.com" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            </div>
                            <div>
                                <label for="admin-password" class="block text-sm font-medium text-gray-300 mb-1">Password</label>
                                <input type="password" id="admin-password" placeholder="********" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            </div>
                            <button type="submit" class="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 transition-colors duration-200">Login</button>
                            <p id="login-error-message" class="text-red-400 text-center mt-4 hidden"></p>
                        </form>
                    </div>
                `;
            } else {
                // If authenticated with a non-anonymous user, show the admin panel content
                breadcrumbText = 'Admin Panel';
                contentHtml = `
                    <h2 class="text-3xl font-bold mb-6 text-blue-400">Admin Panel</h2>
                    <p class="text-gray-300 mb-4">Current User ID: <span class="font-bold text-orange-400">${currentUserId}</span></p>

                    <div class="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h3 class="text-2xl font-bold mb-4 text-blue-300">Add/Edit Document</h3>
                        <form id="document-form" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="hidden" id="doc-id">
                            <div>
                                <label for="doc-type" class="block text-sm font-medium text-gray-300 mb-1">Document Type</label>
                                <select id="doc-type" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                                    <option value="">Select Type</option>
                                    <option value="federal-law">Federal Law</option>
                                    <option value="executive-document">Executive Document</option>
                                    <option value="judicial-document">Judicial Document</option>
                                    <option value="treaty-resolution">Treaty & Resolution</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label for="doc-title" class="block text-sm font-medium text-gray-300 mb-1">Title</label>
                                <input type="text" id="doc-title" placeholder="Document Title" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            </div>
                            <div id="dynamic-fields" class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Dynamic fields based on doc-type will be loaded here -->
                            </div>
                            <div class="md:col-span-2">
                                <label for="doc-summary" class="block text-sm font-medium text-gray-300 mb-1">Summary</label>
                                <textarea id="doc-summary" placeholder="Brief summary of the document" rows="3" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required></textarea>
                            </div>
                            <div class="md:col-span-2 flex flex-col sm:flex-row gap-4">
                                <button type="submit" class="flex-1 py-3 px-6 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 transition-colors duration-200">Save Document</button>
                                <button type="button" id="cancel-edit" class="flex-1 py-3 px-6 bg-gray-600 text-white font-semibold rounded-md shadow-md hover:bg-gray-700 transition-colors duration-200" style="display:none;">Cancel Edit</button>
                            </div>
                        </form>
                    </div>

                    <div class="mt-10">
                        <h3 class="text-2xl font-bold mb-4 text-blue-300">Existing Documents</h3>
                        <div id="admin-document-list" class="space-y-4">
                            Loading documents...
                        </div>
                    </div>
                    <div class="mt-8 text-center">
                        <button id="admin-logout-button" class="py-2 px-4 bg-red-600 text-white font-semibold rounded-md shadow-md hover:bg-red-700 transition-colors duration-200">Logout</button>
                    </div>
                `;
            }
            break;
        case 'archive-help':
            breadcrumbText = 'Archive Help & Guide';
            contentHtml = `
                <h2 class="text-3xl font-bold mb-6 text-blue-400">Archive Help & Guide</h2>
                <div class="prose text-gray-200 max-w-none">
                    <p>Welcome to the Federal Legal & Government Document Archive. This guide will help you navigate and utilize the portal effectively.</p>
                    <h3 class="text-2xl font-bold mt-8 mb-4 text-blue-300">How to Use the Search Portal</h3>
                    <p>Use the sidebar on the left to select a document category. Each category provides specific filters to refine your search. Enter keywords, dates, or other relevant criteria and click "Search".</p>
                    <h3 class="text-2xl font-bold mt-8 mb-4 text-blue-300">Understanding Search Results</h3>
                    <p>Search results are displayed in a list format. Click on a result card to see a detailed view of the document, including its full summary and metadata. A "View Document Externally" button is available for accessing official sources (placeholder in this demo).</p>
                    <h3 class="text-2xl font-bold mt-8 mb-4 text-blue-300">Key Features</h3>
                    <ul>
                        <li><strong>Category-Specific Filters:</strong> Tailored search options for different document types.</li>
                        <li><strong>Advanced Search:</strong> Combine criteria across multiple categories for comprehensive searches.</li>
                        <li><strong>Responsive Design:</strong> Access the portal seamlessly on desktop, tablet, and mobile devices.</li>
                        <li><strong>Admin Panel:</strong> For authorized users to add, edit, and delete documents (requires authentication).</li>
                    </ul>
                    <h3 class="text-2xl font-bold mt-8 mb-4 text-blue-300">Contact Support</h3>
                    <p>If you encounter any issues or have questions, please refer to the <a href="#" data-category="faqs" class="text-blue-400 hover:underline">FAQs section</a> or contact our support team at <a href="mailto:support@archive.gov" class="text-blue-400 hover:underline">support@archive.gov</a>.</p>
                </div>
            `;
            break;
        case 'faqs':
            breadcrumbText = 'FAQs';
            contentHtml = `
                <h2 class="text-3xl font-bold mb-6 text-blue-400">Frequently Asked Questions (FAQs)</h2>
                <div class="prose text-gray-200 max-w-none">
                    <h3 class="text-2xl font-bold mt-8 mb-4 text-blue-300">General Questions</h3>
                    <div class="mb-4">
                        <h4 class="text-xl font-semibold text-gray-200">Q: What kind of documents can I find here?</h4>
                        <p>A: This archive contains Federal Laws, Executive Documents (Presidential orders, ministerial decrees), Judicial Documents (court rulings), and International Treaties & Resolutions.</p>
                    </div>
                    <div class="mb-4">
                        <h4 class="text-xl font-semibold text-gray-200">Q: How often is the archive updated?</h4>
                        <p>A: The archive is updated regularly, typically within 24-48 hours of a document's official publication.</p>
                    </div>

                    <h3 class="text-2xl font-bold mt-8 mb-4 text-blue-300">Search Questions</h3>
                    <div class="mb-4">
                        <h4 class="text-xl font-semibold text-gray-200">Q: Can I search by multiple criteria?</h4>
                        <p>A: Yes, each category has specific filters. For a broader search, use the "Advanced Search" page to combine criteria across document types.</p>
                    </div>
                    <div class="mb-4">
                        <h4 class="text-xl font-semibold text-gray-200">Q: What if I can't find a specific document?</h4>
                        <p>A: Double-check your search terms and filters. If you still can't find it, it might not be in the archive yet, or you can try a broader keyword search in the "Advanced Search" section.</p>
                    </div>
                </div>
            `;
            break;
        default:
            breadcrumbText = 'Home';
            contentHtml = `
                <h2 class="text-3xl font-bold mb-6 text-blue-400">Welcome to the Federal Legal & Government Document Archive</h2>
                <p class="text-lg text-gray-300 mb-8">Your comprehensive portal for official Russian legal and government documents.</p>
                <p class="text-gray-300 mb-4">Use the sidebar navigation to explore different categories of documents:</p>
                <ul class="list-disc list-inside space-y-2 text-gray-300">
                    <li><strong>Federal Laws:</strong> Search all codified laws (Titles 1–8).</li>
                    <li><strong>Executive Documents:</strong> Find Presidential orders, ministerial decrees, etc.</li>
                    <li><strong>Judicial Documents:</strong> Access court rulings, opinions, and prosecutorial guidelines.</li>
                    <li><strong>Treaties & Resolutions:</strong> Browse ratified treaties and legislative resolutions.</li>
                    <li><strong>Advanced Search:</strong> Perform combined searches across all categories.</li>
                </ul>
                <p class="mt-6 text-gray-300">Begin your search by selecting a category from the left sidebar.</p>
            `;
    }
    mainContentDiv.innerHTML = contentHtml;
    breadcrumbCategory.textContent = breadcrumbText;

    // Attach event listeners for search and clear buttons
    if (category !== 'admin-panel' && category !== 'archive-help' && category !== 'faqs') {
        const searchButton = document.getElementById(`search-${category.replace('-', '')}`);
        const clearButton = document.getElementById(`clear-${category.replace('-', '')}`);
        const resultsDiv = document.getElementById(`${category}-results`);

        if (searchButton) {
            searchButton.addEventListener('click', async () => {
                resultsDiv.innerHTML = '<p class="text-gray-400">Searching...</p>';
                // For demo, we'll pass filters to fetchDocuments
                const filters = {};
                if (category === 'federal-laws') {
                    filters.codeTitle = document.getElementById('law-title-filter').value;
                    filters.status = document.getElementById('law-status-filter').value;
                    filters.yearFrom = document.getElementById('law-year-from').value;
                    filters.yearTo = document.getElementById('law-year-to').value;
                    filters.keywords = document.getElementById('law-keywords-filter').value;
                    filters.sponsor = document.getElementById('law-sponsor-filter').value;
                } else if (category === 'executive-documents') {
                    filters.issuingAuthority = document.getElementById('executive-authority-filter').value;
                    filters.documentType = document.getElementById('executive-type-filter').value;
                    filters.yearFrom = document.getElementById('executive-year-from').value;
                    filters.yearTo = document.getElementById('executive-year-to').value;
                    filters.keywords = document.getElementById('executive-keywords-filter').value;
                } else if (category === 'judicial-documents') {
                    filters.court = document.getElementById('judicial-court-filter').value;
                    filters.judgeProsecutor = document.getElementById('judicial-judge-filter').value;
                    filters.caseType = document.getElementById('judicial-case-type-filter').value;
                    filters.yearFrom = document.getElementById('judicial-year-from').value;
                    filters.yearTo = document.getElementById('judicial-year-to').value;
                    filters.keywords = document.getElementById('judicial-keywords-filter').value;
                } else if (category === 'treaties-resolutions') {
                    filters.documentType = document.getElementById('treaty-type-filter').value;
                    filters.status = document.getElementById('treaty-status-filter').value;
                    filters.yearFrom = document.getElementById('treaty-year-from').value;
                    filters.yearTo = document.getElementById('treaty-year-to').value;
                    filters.partiesInvolved = document.getElementById('treaty-parties-filter').value;
                    filters.titleNumber = document.getElementById('treaty-title-number-filter').value;
                    filters.keywords = document.getElementById('treaty-keywords-filter').value;
                } else if (category === 'advanced-search') {
                    filters.documentCategories = Array.from(document.querySelectorAll('input[name="doc-type"]:checked')).map(cb => cb.value);
                    filters.keywords = document.getElementById('advanced-keywords-filter').value;
                    filters.yearFrom = document.getElementById('advanced-year-from').value;
                    filters.yearTo = document.getElementById('advanced-year-to').value;
                }

                const filteredDocs = await fetchDocuments(category, filters);
                resultsDiv.innerHTML = generateSearchResultsHtml(filteredDocs);
                attachDocumentCardListeners(); // Re-attach listeners after new content
            });
        }
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                // Reset all input fields for the current category
                const formElements = mainContentDiv.querySelectorAll('input, select, textarea');
                formElements.forEach(el => {
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        el.checked = false;
                    } else {
                        el.value = '';
                    }
                });
                resultsDiv.innerHTML = '<p class="text-gray-400">Filters cleared. Perform a new search.</p>';
            });
        }
        // Initial load of documents for search pages
        const initialDocs = await fetchDocuments(category);
        resultsDiv.innerHTML = generateSearchResultsHtml(initialDocs);
        attachDocumentCardListeners();
    } else if (category === 'admin-panel' && auth.currentUser && !auth.currentUser.isAnonymous) {
        setupAdminPanel();
    } else if (category === 'admin-panel' && (!auth.currentUser || auth.currentUser.isAnonymous)) {
        // Attach login form listener if it's the admin login page
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('admin-email').value;
                const password = document.getElementById('admin-password').value;
                const errorMessageDiv = document.getElementById('login-error-message');
                errorMessageDiv.classList.add('hidden'); // Hide previous errors

                try {
                    await window.firebase.signInWithEmailAndPassword(auth, email, password);
                    window.showMessageBox("Logged in successfully!");
                    // No need to call renderContent('admin-panel') here, onAuthStateChanged will handle it
                } catch (error) {
                    console.error("Login error:", error);
                    errorMessageDiv.textContent = `Login failed: ${error.message}`;
                    errorMessageDiv.classList.remove('hidden');
                }
            });
        }
    }
}

// Attach listeners to document cards (for detail view)
function attachDocumentCardListeners() {
    document.querySelectorAll('.document-card').forEach(card => {
        card.addEventListener('click', async function() {
            const docId = this.dataset.docId;
            if (docId && db && currentUserId) {
                try {
                    // Fetch from the user's private collection
                    const docRef = window.firebase.doc(db, `artifacts/${appId}/users/${currentUserId}/documents`, docId);
                    const docSnap = await window.firebase.getDoc(docRef);
                    if (docSnap.exists()) {
                        window.showDocumentDetail({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        window.showMessageBox("Document not found.");
                    }
                } catch (error) {
                    console.error("Error fetching document for detail:", error);
                    window.showMessageBox("Error loading document details.");
                }
            } else {
                window.showMessageBox("Cannot retrieve document details without an active database connection or valid document ID.");
            }
        });
    });
}

// Firestore Functions
async function fetchDocuments(category = 'all', filters = {}) {
    if (!db || !currentUserId) {
        console.warn("Firestore not ready or user not authenticated. Returning no data.");
        // Return empty array if Firebase not initialized
        return [];
    }

    // All user data is stored under their specific user ID
    const documentsRef = window.firebase.collection(db, `artifacts/${appId}/users/${currentUserId}/documents`);
    let q = window.firebase.query(documentsRef);

    // Apply category filter if not 'all' or 'advanced-search' (advanced handles its own type filtering)
    if (category !== 'all' && category !== 'admin-panel' && category !== 'advanced-search') {
        q = window.firebase.query(q, window.firebase.where('type', '==', category.replace('-documents', '-document').replace('-laws', '-law').replace('-resolutions', '-resolution')));
    } else if (category === 'advanced-search' && filters.documentCategories && filters.documentCategories.length > 0) {
        // For advanced search, if specific document types are selected, filter by them
        // Note: Firestore 'in' query is limited to 10 values. For more, separate queries needed.
        if (filters.documentCategories.length <= 10) {
             q = window.firebase.query(q, window.firebase.where('type', 'in', filters.documentCategories));
        } else {
            console.warn("Too many document categories selected for a single Firestore 'in' query. Results might be incomplete.");
            // Fallback to client-side filtering or multiple queries if needed
        }
    }


    // Apply other filters (simplified for now)
    // Note: Firestore queries are complex with multiple 'where' clauses.
    // For robust filtering, consider combining filters carefully or using a search service.
    // For this demo, we'll primarily rely on client-side filtering for keywords/years if not directly supported by Firestore query.
    try {
        const querySnapshot = await window.firebase.getDocs(q);
        let documents = [];
        querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
        });

        // Client-side filtering for keywords, years, and other specific filters
        documents = documents.filter(doc => {
            let matches = true;

            // Keyword filtering (case-insensitive, checks title, summary, and tags)
            if (filters.keywords) {
                const keywordLower = filters.keywords.toLowerCase();
                const docContent = `${doc.title || ''} ${doc.summary || ''} ${doc.tags || ''}`.toLowerCase();
                if (!docContent.includes(keywordLower)) {
                    matches = false;
                }
            }

            // Year range filtering
            const docYear = parseInt(doc.dateEnacted || doc.dateIssued || doc.dateSignedAdopted);
            if (filters.yearFrom && docYear < parseInt(filters.yearFrom)) {
                matches = false;
            }
            if (filters.yearTo && docYear > parseInt(filters.yearTo)) {
                matches = false;
            }

            // Specific filters for each category (client-side for demo)
            if (category === 'federal-laws') {
                if (filters.codeTitle && doc.codeTitle !== filters.codeTitle) matches = false;
                if (filters.status && doc.status !== filters.status) matches = false;
                if (filters.sponsor && !(doc.issuingAuthority || '').toLowerCase().includes(filters.sponsor.toLowerCase())) matches = false;
            } else if (category === 'executive-documents') {
                if (filters.issuingAuthority && doc.issuingAuthority !== filters.issuingAuthority) matches = false;
                if (filters.documentType && doc.documentType !== filters.documentType) matches = false;
            } else if (category === 'judicial-documents') {
                if (filters.court && doc.court !== filters.court) matches = false;
                if (filters.judgeProsecutor && !(doc.judgeProsecutor || '').toLowerCase().includes(filters.judgeProsecutor.toLowerCase())) matches = false;
                if (filters.caseType && doc.caseType !== filters.caseType) matches = false;
            } else if (category === 'treaties-resolutions') {
                if (filters.documentType && doc.documentType !== filters.documentType) matches = false;
                if (filters.status && doc.status !== filters.status) matches = false;
                if (filters.partiesInvolved && !(doc.partiesInvolved || '').toLowerCase().includes(filters.partiesInvolved.toLowerCase())) matches = false;
                if (filters.titleNumber && !(doc.title || '').toLowerCase().includes(filters.titleNumber.toLowerCase())) matches = false;
            } else if (category === 'advanced-search') {
                // If documentCategories were used in 'in' query, this is redundant, but useful for client-side fallback
                if (filters.documentCategories && filters.documentCategories.length > 0 && !filters.documentCategories.includes(doc.type)) {
                     matches = false;
                }
            }

            return matches;
        });

        return documents;
    } catch (error) {
        console.error("Error fetching documents:", error);
        window.showMessageBox("Error fetching documents. Check console for details.");
        return [];
    }
}

// Removed getMockDocuments function as per request.

// Admin Panel Functions
async function setupAdminPanel() {
    if (!db || !currentUserId || auth.currentUser.isAnonymous) {
        // This case should ideally not be reached if renderContent handles it,
        // but as a safeguard, ensure the user is not anonymous.
        document.getElementById('admin-document-list').innerHTML = '<p class="text-red-400">Authentication required to access admin features. Please log in.</p>';
        return;
    }

    const documentForm = document.getElementById('document-form');
    const docIdField = document.getElementById('doc-id');
    const docTypeSelect = document.getElementById('doc-type');
    const docTitleInput = document.getElementById('doc-title');
    const docSummaryInput = document.getElementById('doc-summary');
    const dynamicFieldsDiv = document.getElementById('dynamic-fields');
    const adminDocumentListDiv = document.getElementById('admin-document-list');
    const cancelEditButton = document.getElementById('cancel-edit');
    const adminLogoutButton = document.getElementById('admin-logout-button');


    // Function to render dynamic fields based on document type
    function renderDynamicFields(type, docData = {}) {
        let fieldsHtml = '';
        switch (type) {
            case 'federal-law':
                fieldsHtml = `
                    <div>
                        <label for="fl-date-enacted" class="block text-sm font-medium text-gray-300 mb-1">Date Enacted</label>
                        <input type="date" id="fl-date-enacted" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.dateEnacted || ''}" required>
                    </div>
                    <div>
                        <label for="fl-issuing-authority" class="block text-sm font-medium text-gray-300 mb-1">Issuing Authority</label>
                        <input type="text" id="fl-issuing-authority" placeholder="e.g., State Duma" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.issuingAuthority || ''}" required>
                    </div>
                    <div>
                        <label for="fl-status" class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select id="fl-status" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            <option value="">Select Status</option>
                            <option value="Active" ${docData.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Repealed" ${docData.status === 'Repealed' ? 'selected' : ''}>Repealed</option>
                            <option value="Pending" ${docData.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        </select>
                    </div>
                    <div>
                        <label for="fl-code-title" class="block text-sm font-medium text-gray-300 mb-1">Code Title</label>
                        <input type="text" id="fl-code-title" placeholder="e.g., Title 2 - Criminal Law" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.codeTitle || ''}" required>
                    </div>
                    <div class="md:col-span-2">
                        <label for="fl-tags" class="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
                        <input type="text" id="fl-tags" placeholder="e.g., environment, tax" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.tags || ''}">
                    </div>
                `;
                break;
            case 'executive-document':
                fieldsHtml = `
                    <div>
                        <label for="ed-issuing-authority" class="block text-sm font-medium text-gray-300 mb-1">Issuing Authority</label>
                        <input type="text" id="ed-issuing-authority" placeholder="e.g., President, Ministry of Justice" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.issuingAuthority || ''}" required>
                    </div>
                    <div>
                        <label for="ed-date-issued" class="block text-sm font-medium text-gray-300 mb-1">Date Issued</label>
                        <input type="date" id="ed-date-issued" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.dateIssued || ''}" required>
                    </div>
                    <div>
                        <label for="ed-document-type" class="block text-sm font-medium text-gray-300 mb-1">Document Type</label>
                        <select id="ed-document-type" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            <option value="">Select Type</option>
                            <option value="Order" ${docData.documentType === 'Order' ? 'selected' : ''}>Order</option>
                            <option value="Decree" ${docData.documentType === 'Decree' ? 'selected' : ''}>Decree</option>
                            <option value="Instruction" ${docData.documentType === 'Instruction' ? 'selected' : ''}>Instruction</option>
                        </select>
                    </div>
                    <div>
                        <label for="ed-status" class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select id="ed-status" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            <option value="">Select Status</option>
                            <option value="Current" ${docData.status === 'Current' ? 'selected' : ''}>Current</option>
                            <option value="Superseded" ${docData.status === 'Superseded' ? 'selected' : ''}>Superseded</option>
                            <option value="Expired" ${docData.status === 'Expired' ? 'selected' : ''}>Expired</option>
                        </select>
                    </div>
                `;
                break;
            case 'judicial-document':
                fieldsHtml = `
                    <div>
                        <label for="jd-court" class="block text-sm font-medium text-gray-300 mb-1">Court</label>
                        <input type="text" id="jd-court" placeholder="e.g., Supreme Court" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.court || ''}" required>
                    </div>
                    <div>
                        <label for="jd-date-issued" class="block text-sm font-medium text-gray-300 mb-1">Date Issued</label>
                        <input type="date" id="jd-date-issued" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.dateIssued || ''}" required>
                    </div>
                    <div>
                        <label for="jd-judge-prosecutor" class="block text-sm font-medium text-gray-300 mb-1">Judge / Prosecutor</label>
                        <input type="text" id="jd-judge-prosecutor" placeholder="e.g., Judge Ivanov" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.judgeProsecutor || ''}" required>
                    </div>
                    <div>
                        <label for="jd-case-type" class="block text-sm font-medium text-gray-300 mb-1">Case Type</label>
                        <select id="jd-case-type" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            <option value="">Select Type</option>
                            <option value="Criminal" ${docData.caseType === 'Criminal' ? 'selected' : ''}>Criminal</option>
                            <option value="Civil" ${docData.caseType === 'Civil' ? 'selected' : ''}>Civil</option>
                            <option value="Administrative" ${docData.caseType === 'Administrative' ? 'selected' : ''}>Administrative</option>
                        </select>
                    </div>
                    <div>
                        <label for="jd-status" class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select id="jd-status" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            <option value="">Select Status</option>
                            <option value="Final" ${docData.status === 'Final' ? 'selected' : ''}>Final</option>
                            <option value="Appealed" ${docData.status === 'Appealed' ? 'selected' : ''}>Appealed</option>
                            <option value="Pending" ${docData.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        </select>
                    </div>
                `;
                break;
            case 'treaty-resolution':
                fieldsHtml = `
                    <div>
                        <label for="tr-document-type" class="block text-sm font-medium text-gray-300 mb-1">Document Type</label>
                        <select id="tr-document-type" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            <option value="">Select Type</option>
                            <option value="Treaty" ${docData.documentType === 'Treaty' ? 'selected' : ''}>Treaty</option>
                            <option value="Resolution" ${docData.documentType === 'Resolution' ? 'selected' : ''}>Resolution</option>
                        </select>
                    </div>
                    <div>
                        <label for="tr-date-signed-adopted" class="block text-sm font-medium text-gray-300 mb-1">Date Signed / Adopted</label>
                        <input type="date" id="tr-date-signed-adopted" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.dateSignedAdopted || ''}" required>
                    </div>
                    <div>
                        <label for="tr-status" class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select id="tr-status" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" required>
                            <option value="">Select Status</option>
                            <option value="Active" ${docData.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Superseded" ${docData.status === 'Superseded' ? 'selected' : ''}>Superseded</option>
                            <option value="Pending" ${docData.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        </select>
                    </div>
                    <div>
                        <label for="tr-parties-involved" class="block text-sm font-medium text-gray-300 mb-1">Parties Involved (comma-separated)</label>
                        <input type="text" id="tr-parties-involved" placeholder="e.g., Russia, UN" class="mt-1 block w-full p-3 border border-gray-500 rounded-md shadow-sm" value="${docData.partiesInvolved || ''}">
                    </div>
                `;
                break;
            default:
                fieldsHtml = '<p class="text-gray-400 md:col-span-2">Select a document type to see specific fields.</p>';
        }
        dynamicFieldsDiv.innerHTML = fieldsHtml;
    }

    // Listen for document type change to render dynamic fields
    docTypeSelect.addEventListener('change', () => {
        renderDynamicFields(docTypeSelect.value);
    });

    // Handle form submission (Add/Edit Document)
    documentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const docId = docIdField.value;
        const type = docTypeSelect.value;
        const title = docTitleInput.value;
        const summary = docSummaryInput.value;

        let documentData = { type, title, summary };

        // Collect dynamic fields
        switch (type) {
            case 'federal-law':
                documentData.dateEnacted = document.getElementById('fl-date-enacted').value;
                documentData.issuingAuthority = document.getElementById('fl-issuing-authority').value;
                documentData.status = document.getElementById('fl-status').value;
                documentData.codeTitle = document.getElementById('fl-code-title').value;
                documentData.tags = document.getElementById('fl-tags').value;
                break;
            case 'executive-document':
                documentData.issuingAuthority = document.getElementById('ed-issuing-authority').value;
                documentData.dateIssued = document.getElementById('ed-date-issued').value;
                documentData.documentType = document.getElementById('ed-document-type').value;
                documentData.status = document.getElementById('ed-status').value;
                break;
            case 'judicial-document':
                documentData.court = document.getElementById('jd-court').value;
                documentData.dateIssued = document.getElementById('jd-date-issued').value;
                documentData.judgeProsecutor = document.getElementById('jd-judge-prosecutor').value;
                documentData.caseType = document.getElementById('jd-case-type').value;
                documentData.status = document.getElementById('jd-status').value;
                break;
            case 'treaty-resolution':
                documentData.documentType = document.getElementById('tr-document-type').value;
                documentData.dateSignedAdopted = document.getElementById('tr-date-signed-adopted').value;
                documentData.status = document.getElementById('tr-status').value;
                documentData.partiesInvolved = document.getElementById('tr-parties-involved').value;
                break;
        }

        try {
            const documentsCollection = window.firebase.collection(db, `artifacts/${appId}/users/${currentUserId}/documents`);
            if (docId) {
                // Update existing document
                const docRef = window.firebase.doc(documentsCollection, docId);
                await window.firebase.updateDoc(docRef, documentData);
                window.showMessageBox("Document updated successfully!");
            } else {
                // Add new document
                await window.firebase.addDoc(documentsCollection, documentData);
                window.showMessageBox("Document added successfully!");
            }
            documentForm.reset();
            docIdField.value = ''; // Clear ID after save
            renderDynamicFields(''); // Clear dynamic fields
            cancelEditButton.style.display = 'none';
        } catch (error) {
            console.error("Error saving document:", error);
            window.showMessageBox("Error saving document. Check console for details.");
        }
    });

    // Cancel Edit button
    cancelEditButton.addEventListener('click', () => {
        documentForm.reset();
        docIdField.value = '';
        renderDynamicFields('');
        cancelEditButton.style.display = 'none';
    });

    // Admin Logout button
    adminLogoutButton.addEventListener('click', async () => {
        try {
            await window.firebase.signOut(auth);
            window.showMessageBox("Logged out successfully!");
            renderContent('admin-panel'); // Go back to login screen
        } catch (error) {
            console.error("Logout error:", error);
            window.showMessageBox("Error logging out. Try again.");
        }
    });


    // Real-time listener for documents
    const documentsCollectionRef = window.firebase.collection(db, `artifacts/${appId}/users/${currentUserId}/documents`);
    window.firebase.onSnapshot(documentsCollectionRef, (snapshot) => {
        const documents = [];
        snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        displayAdminDocuments(documents);
    }, (error) => {
        console.error("Error listening to documents:", error);
        adminDocumentListDiv.innerHTML = `<p class="text-red-400">Error loading documents: ${error.message}</p>`;
    });

    function displayAdminDocuments(documents) {
        if (documents.length === 0) {
            adminDocumentListDiv.innerHTML = '<p class="text-gray-400">No documents added yet.</p>';
            return;
        }
        adminDocumentListDiv.innerHTML = documents.map(doc => `
            <div class="bg-gray-800 p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h4 class="text-lg font-semibold text-blue-400">${doc.title} (${doc.type})</h4>
                    <p class="text-sm text-gray-400 line-clamp-2">${doc.summary}</p>
                    <p class="text-xs text-gray-500">ID: ${doc.id}</p>
                </div>
                <div class="flex space-x-2 mt-3 md:mt-0">
                    <button class="py-1 px-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 edit-doc-btn" data-id="${doc.id}">Edit</button>
                    <button class="py-1 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 delete-doc-btn" data-id="${doc.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Attach edit and delete listeners
        document.querySelectorAll('.edit-doc-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const docId = e.target.dataset.id;
                const docRef = window.firebase.doc(documentsCollectionRef, docId);
                const docSnap = await window.firebase.getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    docIdField.value = docSnap.id;
                    docTypeSelect.value = data.type;
                    docTitleInput.value = data.title;
                    docSummaryInput.value = data.summary;
                    renderDynamicFields(data.type, data); // Populate dynamic fields
                    cancelEditButton.style.display = 'inline-block';
                    window.showMessageBox("Editing document.");
                } else {
                    window.showMessageBox("Document not found for editing.");
                }
            });
        });

        document.querySelectorAll('.delete-doc-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const docId = e.target.dataset.id;
                if (confirm("Are you sure you want to delete this document?")) { // Using confirm for simplicity in admin panel
                    try {
                        const docRef = window.firebase.doc(documentsCollectionRef, docId);
                        await window.firebase.deleteDoc(docRef);
                        window.showMessageBox("Document deleted successfully!");
                    } catch (error) {
                        console.error("Error deleting document:", error);
                        window.showMessageBox("Error deleting document. Check console for details.");
                    }
                }
            });
        });
    }

    // Initial render of dynamic fields (empty)
    renderDynamicFields('');
}


// Event listeners for sidebar links
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const category = this.dataset.category;
        renderContent(category);

        // Update active link styling
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active-link'));
        this.classList.add('active-link');
    });
});