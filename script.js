// ==========================================
// PHASE 1: RACE PROFILE & TIMING SPINE
// ==========================================

// Profile Manager
class ProfileManager {
    constructor() {
        this.storageKey = 'raceProfile';
        this.timingSpineKey = 'timingSpine';
    }

    saveProfile(profileData) {
        localStorage.setItem(this.storageKey, JSON.stringify(profileData));
    }

    getProfile() {
        const profile = localStorage.getItem(this.storageKey);
        return profile ? JSON.parse(profile) : null;
    }

    saveTimingSpine(timingSpineData) {
        localStorage.setItem(this.timingSpineKey, JSON.stringify(timingSpineData));
    }

    getTimingSpine() {
        const spine = localStorage.getItem(this.timingSpineKey);
        return spine ? JSON.parse(spine) : null;
    }

    clearProfile() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.timingSpineKey);
    }
}

// Timing Spine Generator
class TimingSpineGenerator {
    constructor(profile) {
        this.profile = profile;
    }

    generate() {
        const raceStart = this.parseTime(this.profile.race.startTime);
        const warmupDuration = this.getWarmupDuration();
        const travelTime = parseInt(this.profile.logistics.travelTime) || 30;

        // Calculate key times working backwards from race start
        const times = {};

        // T-0: Race start
        times.T_0 = {
            label: 'Race Start',
            action: 'GO! Execute your race plan.',
            time: this.formatTime(raceStart),
            minutes: 0
        };

        // T-15: Final mental prep
        const t15 = new Date(raceStart - 15 * 60000);
        times.T_15 = {
            label: 'Final Mental Prep',
            action: 'Breathing work, visualization, confidence statements.',
            time: this.formatTime(t15),
            minutes: 15
        };

        // T-30: Corral/final checks
        const t30 = new Date(raceStart - 30 * 60000);
        times.T_30 = {
            label: 'Corral Prep',
            action: 'Final checklist: bib pinned, shoes tight, bathroom done.',
            time: this.formatTime(t30),
            minutes: 30
        };

        // T-60: Warm-up ends, final stretch
        const t60 = new Date(raceStart - 60 * 60000);
        times.T_60 = {
            label: 'Warm-up Complete',
            action: 'Light static stretching, get to call room.',
            time: this.formatTime(t60),
            minutes: 60
        };

        // T-(60+warmupDuration): Warm-up starts
        const warmupStart = new Date(raceStart - (60 + warmupDuration) * 60000);
        times[`T_${60 + warmupDuration}`] = {
            label: 'Warm-up Start',
            action: 'Joint mobility → strides → activation.',
            time: this.formatTime(warmupStart),
            minutes: 60 + warmupDuration
        };

        // T-90: Arrive at venue
        const arrivalTime = this.profile.logistics.arrivalTime ?
            this.parseTime(this.profile.logistics.arrivalTime) :
            new Date(raceStart - (90 + travelTime) * 60000);

        const t90 = new Date(raceStart - 90 * 60000);
        times.T_90 = {
            label: 'Travel to Venue / Arrive',
            action: 'Get to venue, find warm-up area.',
            time: this.formatTime(arrivalTime),
            minutes: Math.floor((raceStart - arrivalTime) / 60000)
        };

        // T-120: Finish breakfast, hydrate
        const t120 = new Date(raceStart - 120 * 60000);
        times.T_120 = {
            label: 'Finish Breakfast',
            action: 'Hydrate steadily, take care of bathroom needs.',
            time: this.formatTime(t120),
            minutes: 120
        };

        // T-150: Breakfast
        const t150 = new Date(raceStart - 150 * 60000);
        times.T_150 = {
            label: 'Breakfast',
            action: 'Light breakfast: carbs + small protein.',
            time: this.formatTime(t150),
            minutes: 150
        };

        // T-180: Wake up
        const t180 = new Date(raceStart - 180 * 60000);
        times.T_180 = {
            label: 'Wake Up',
            action: 'Light mobility, first drink of water.',
            time: this.formatTime(t180),
            minutes: 180
        };

        return times;
    }

    getWarmupDuration() {
        const pref = this.profile.athlete.warmupDuration;
        let duration = 45; // default medium

        if (pref === 'short') duration = 25;
        else if (pref === 'medium') duration = 45;
        else if (pref === 'long') duration = 75;

        // Adjust for weather
        const temp = parseInt(this.profile.race.weatherTemp) || 15;
        if (temp < 10) duration += 10; // cold = longer warm-up
        if (temp > 25) duration -= 10; // hot = shorter warm-up

        return Math.max(20, Math.min(90, duration)); // clamp 20-90
    }

    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const profileManager = new ProfileManager();
    const profile = profileManager.getProfile();

    // Setup screen visibility
    const setupScreen = document.getElementById('setup-screen');
    const profileSummary = document.getElementById('profile-summary');
    const tabContainer = document.querySelector('.tab-container');

    if (profile) {
        // Show profile summary, hide setup
        setupScreen.style.display = 'none';
        profileSummary.style.display = 'block';
        tabContainer.style.display = 'flex';
        updateProfileSummary(profile);
        updateTabsWithTiming(profile, profileManager.getTimingSpine());
    } else {
        // Show setup, hide others
        setupScreen.style.display = 'block';
        profileSummary.style.display = 'none';
        tabContainer.style.display = 'none';
    }

    // Form submission
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect form data
        const formData = new FormData(profileForm);
        const profileData = {
            race: {
                name: formData.get('raceName'),
                distance: formData.get('distance'),
                location: formData.get('raceName'), // using same as name for now
                date: formData.get('date'),
                startTime: formData.get('startTime'),
                goalTime: formData.get('goalTime'),
                courseType: formData.get('courseType'),
                courseProfile: formData.get('courseProfile'),
                weatherTemp: formData.get('weatherTemp'),
                weatherConditions: formData.get('weatherConditions')
            },
            logistics: {
                travelTime: formData.get('travelTime'),
                arrivalTime: formData.get('arrivalTime'),
                hardConstraints: formData.get('hardConstraints')
            },
            athlete: {
                warmupDuration: formData.get('warmupDuration'),
                caffeineTolerance: formData.get('caffeineTolerance'),
                taperPreference: formData.get('taperPreference'),
                injuryConcerns: formData.get('injuryConcerns'),
                notes: formData.get('notes')
            }
        };

        // Generate timing spine
        const generator = new TimingSpineGenerator(profileData);
        const timingSpine = generator.generate();

        // Save to localStorage
        profileManager.saveProfile(profileData);
        profileManager.saveTimingSpine(timingSpine);

        // Update UI
        setupScreen.style.display = 'none';
        profileSummary.style.display = 'block';
        tabContainer.style.display = 'flex';

        updateProfileSummary(profileData);
        updateTabsWithTiming(profileData, timingSpine);

        // Scroll to profile summary
        profileSummary.scrollIntoView({ behavior: 'smooth' });
    });

    // Edit profile button
    const editBtn = document.getElementById('edit-profile-btn');
    editBtn.addEventListener('click', () => {
        setupScreen.style.display = 'block';
        profileSummary.style.display = 'none';
        tabContainer.style.display = 'none';
        setupScreen.scrollIntoView({ behavior: 'smooth' });
    });

    // Initialize tab switching
    initTabs();
    initChecklists();
});

// Update profile summary card
function updateProfileSummary(profile) {
    const nameEl = document.getElementById('summary-race-name');
    const detailsEl = document.getElementById('summary-race-details');

    nameEl.textContent = profile.race.name;
    detailsEl.textContent = `${profile.race.distance} • ${profile.race.date} • ${profile.race.startTime}`;
}

// Update tabs with timing spine
function updateTabsWithTiming(profile, timingSpine) {
    // This will be filled in as we build out day-before and race-day tabs
    // For now, store the timing spine in window for tab population
    window.currentTimingSpine = timingSpine;
}

// Tab switching functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            localStorage.setItem('activeTab', tabName);
        });
    });

    // Restore last active tab
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        const savedButton = document.querySelector(`[data-tab="${savedTab}"]`);
        if (savedButton) {
            savedButton.click();
        }
    }
}

// Checklist functionality
function initChecklists() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
        const savedState = localStorage.getItem(`checkbox-${index}`);
        if (savedState === 'true') {
            checkbox.checked = true;
        }

        checkbox.addEventListener('change', () => {
            localStorage.setItem(`checkbox-${index}`, checkbox.checked);
        });
    });

    // Reset button
    const resetButtonContainer = document.querySelector('.container');
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset All';
    resetButton.className = 'reset-button';
    resetButton.style.cssText = `
        display: block;
        margin: 20px auto;
        padding: 10px 20px;
        background: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
        color: #666;
        transition: all 0.3s ease;
    `;

    resetButton.addEventListener('mouseover', () => {
        resetButton.style.background = '#e0e0e0';
    });

    resetButton.addEventListener('mouseout', () => {
        resetButton.style.background = '#f0f0f0';
    });

    resetButton.addEventListener('click', () => {
        if (confirm('Reset all checkboxes? This cannot be undone.')) {
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = false;
                localStorage.removeItem(`checkbox-${index}`);
            });
        }
    });

    resetButtonContainer.appendChild(resetButton);
}
