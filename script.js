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
    console.log('updateTabsWithTiming called with:', { profile, timingSpine });
    window.currentTimingSpine = timingSpine;

    // Populate immediately
    populateDayBeforeTimeline(profile, timingSpine);
    populateRaceDayTimeline(profile, timingSpine);
}

// Populate Day Before timeline
function populateDayBeforeTimeline(profile, timingSpine) {
    const container = document.getElementById('day-before-timeline');

    if (!container) {
        console.error('Day before timeline container not found');
        return;
    }

    console.log('Populating day before timeline');

    // Day Before sections (showing prep activities, not times since day before is not precise)
    const dayBeforeHTML = `
        <div class="section">
            <h2>Physical Preparation</h2>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Recovery & Rest</h3>
                        <p>Keep movement light - no hard efforts today</p>
                    </div>
                </div>
                <div class="timeline-action">
                    ✓ Easy recovery run or rest day (no hard efforts)<br>
                    ✓ 10-15 min easy walk to stay loose<br>
                    ✓ Light stretching (10-15 min)
                </div>
            </div>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Nutrition & Hydration</h3>
                        <p>Carb-load strategically for tomorrow</p>
                    </div>
                </div>
                <div class="timeline-action">
                    ✓ Eat carb-rich meal (pasta, rice, potatoes)<br>
                    ✓ Stay hydrated - drink water throughout the day<br>
                    ✓ Light dinner - no heavy or spicy foods<br>
                    ✓ Avoid excessive caffeine after 2pm
                </div>
            </div>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Gear Check</h3>
                        <p>Get everything ready so race morning is smooth</p>
                    </div>
                </div>
                <div class="timeline-action">
                    ✓ Racing spikes/shoes ready and clean<br>
                    ✓ Racing kit laid out and ready<br>
                    ✓ Bib number obtained<br>
                    ✓ Check weather forecast<br>
                    ✓ Prepare gym bag with extras
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Mental Preparation</h2>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Visualization (10-15 min)</h3>
                        <p>Before bed, rehearse your perfect race</p>
                    </div>
                </div>
                <div class="timeline-action">
                    ✓ See yourself running strong and confident<br>
                    ✓ Visualize smooth acceleration and finishing kick<br>
                    ✓ Picture crossing the finish line with great effort<br>
                    ✓ Feel the emotions of a successful race
                </div>
            </div>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Positive Affirmations</h3>
                        <p>Build your confidence</p>
                    </div>
                </div>
                <div class="timeline-action">
                    Repeat to yourself:<br>
                    • "I am prepared and ready"<br>
                    • "I will run my race with confidence"<br>
                    • "My training has prepared me well"<br>
                    • "I belong on that track"
                </div>
            </div>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Sleep & Mindset</h3>
                        <p>Prioritize rest and mental calm</p>
                    </div>
                </div>
                <div class="timeline-action">
                    ✓ Get to bed early (10-11pm)<br>
                    ✓ Avoid excessive screen time 1 hour before bed<br>
                    ✓ Focus on the process, not the outcome<br>
                    ✓ Accept that race day nerves are normal and positive
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Recovery Prep</h2>
            <p style="color: #666; font-size: 0.95em; margin-bottom: 20px; font-style: italic;">Get ready for post-race recovery.</p>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Recovery Tools</h3>
                        <p>Prepare equipment for after the race</p>
                    </div>
                </div>
                <div class="timeline-action">
                    ✓ Fill ice bath or prepare ice<br>
                    ✓ Have foam roller accessible<br>
                    ✓ Prepare massage tools<br>
                    ✓ Have compression gear ready<br>
                    ✓ Prepare stretching mat
                </div>
            </div>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Recovery Nutrition</h3>
                        <p>Stock up on post-race nutrition</p>
                    </div>
                </div>
                <div class="timeline-action">
                    ✓ Buy/prepare recovery drinks<br>
                    ✓ Have quick carbs ready<br>
                    ✓ Prepare protein sources<br>
                    ✓ Stock water bottles or electrolytes
                </div>
            </div>

            <div class="timeline-block">
                <div class="timeline-header">
                    <div class="timeline-activity">
                        <h3>Recovery Space</h3>
                        <p>Create a comfortable recovery environment</p>
                    </div>
                </div>
                <div class="timeline-action">
                    ✓ Clear stretching/mobility area<br>
                    ✓ Have comfortable recovery clothes ready<br>
                    ✓ Prepare relaxation space (bed/couch)<br>
                    ✓ Set quiet environment for recovery
                </div>
            </div>
        </div>
    `;

    try {
        container.innerHTML = dayBeforeHTML;
        console.log('Day before timeline populated successfully');
    } catch (error) {
        console.error('Error populating day before timeline:', error);
        container.innerHTML = '<p style="padding: 20px; color: red;">Error loading timeline. Please refresh.</p>';
    }
}

// Populate Race Day timeline
function populateRaceDayTimeline(profile, timingSpine) {
    const container = document.getElementById('race-day-timeline');

    console.log('Populating race day timeline', { container, timingSpine });

    if (!container) {
        console.error('Race day timeline container not found');
        return;
    }

    if (!timingSpine) {
        console.log('No timing spine, showing placeholder');
        container.innerHTML = '<p style="padding: 20px; color: #999;">Create your profile to see your personalized race day timeline.</p>';
        return;
    }

    let html = '<div class="section">';

    // Create timeline blocks for each key time
    const timeOrder = ['T_180', 'T_150', 'T_120', 'T_90', 'T_60', 'T_30', 'T_15', 'T_0'];
    let blockCount = 0;

    timeOrder.forEach(key => {
        if (timingSpine[key]) {
            const block = timingSpine[key];
            const indicator = block.minutes === 0 ? 'current' : 'upcoming';

            html += `
                <div class="timeline-block ${indicator}">
                    <div class="timeline-header">
                        <div class="timeline-time">${block.time}</div>
                        <div class="timeline-activity">
                            <h3>${block.label}</h3>
                            <p>${block.action}</p>
                            <div class="timeline-duration">T-${block.minutes} min</div>
                        </div>
                    </div>
                </div>
            `;
            blockCount++;
        }
    });

    // If no blocks were found, show the dynamic warmup time if it exists
    if (blockCount === 0 && timingSpine) {
        // Find the warmup key dynamically
        Object.keys(timingSpine).forEach(key => {
            if (key.startsWith('T_') && !['T_0', 'T_15', 'T_30', 'T_60', 'T_90', 'T_120', 'T_150', 'T_180'].includes(key)) {
                const block = timingSpine[key];
                html += `
                    <div class="timeline-block">
                        <div class="timeline-header">
                            <div class="timeline-time">${block.time}</div>
                            <div class="timeline-activity">
                                <h3>${block.label}</h3>
                                <p>${block.action}</p>
                                <div class="timeline-duration">${key}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }

    // Add mental prep section
    html += `
        </div>
        <div style="margin-top: 30px; padding: 20px; background: #f0f8ff; border-left: 4px solid #667eea; border-radius: 4px;">
            <h3 style="color: #667eea; margin-top: 0;">🧠 Mental Preparation Tools (T-30 to T-0)</h3>
            <p style="color: #666; font-size: 0.95em; margin-bottom: 15px;">Choose the techniques that resonate with you:</p>

            <div style="margin-left: 20px; color: #666; font-size: 0.95em; line-height: 1.8;">
                <strong>🎵 Calming Music</strong> - Play instrumental music to support mental work<br>
                <strong>🫀 Bilateral EFT Tapping</strong> - 5-10 min alternating taps with breathing<br>
                <strong>🎯 Body Scan</strong> - Check in with body, release tension<br>
                <strong>🌍 Grounding (5 Senses)</strong> - Anchor to present moment<br>
                <strong>💪 Power Pose</strong> - Build confidence with body positioning<br>
                <strong>🏁 Race Visualization</strong> - Mental rehearsal of perfect execution
            </div>
        </div>
    `;

    try {
        container.innerHTML = html;
        console.log('Race day timeline populated successfully');
    } catch (error) {
        console.error('Error populating race day timeline:', error);
        container.innerHTML = '<p style="padding: 20px; color: red;">Error loading timeline. Please refresh.</p>';
    }
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
