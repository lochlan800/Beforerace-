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
    const submitBtn = profileForm.querySelector('button[type="submit"]');

    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Change button text to show loading
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ Generating...';
        submitBtn.disabled = true;

        try {
            // Collect form data
            const formData = new FormData(profileForm);
            console.log('Form submitted, collecting data...');

            // Validate required fields
            const requiredFields = ['raceName', 'distance', 'date', 'startTime', 'courseType', 'courseProfile', 'warmupDuration', 'travelTime'];
            let missingFields = [];

            console.log('===== FIELD VALUE CHECK =====');
            for (let field of requiredFields) {
                const value = formData.get(field);
                const isEmpty = !value || value === '';
                console.log(`${field}: "${value}" | Empty: ${isEmpty}`);
                if (isEmpty) {
                    missingFields.push(field);
                }
            }
            console.log('===== END FIELD CHECK =====');
            console.log('Missing fields:', missingFields);

            if (missingFields.length > 0) {
                const fieldList = missingFields.join(', ');
                console.error('VALIDATION FAILED - Missing fields:', fieldList);

                // Show visible error
                const errorBox = document.createElement('div');
                errorBox.style.cssText = 'position: fixed; top: 60px; left: 10px; right: 10px; background: #dc2626; color: white; padding: 20px; border-radius: 8px; z-index: 9999; font-weight: bold; font-size: 16px;';
                errorBox.innerHTML = '🔴 <strong>Missing Required Fields:</strong><br>' + fieldList.replace(/,/g, '<br>');
                document.body.appendChild(errorBox);
                setTimeout(() => { errorBox.remove(); }, 5000);

                alert('Please fill in all required fields:\n' + missingFields.join('\n'));
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }

            console.log('Validation PASSED - all required fields present');

            const profileData = {
                race: {
                    name: formData.get('raceName'),
                    distance: formData.get('distance'),
                    location: formData.get('raceName'),
                    date: formData.get('date'),
                    startTime: formData.get('startTime'),
                    goalTime: formData.get('goalTime') || '',
                    courseType: formData.get('courseType'),
                    courseProfile: formData.get('courseProfile'),
                    weatherTemp: formData.get('weatherTemp') || '15',
                    weatherConditions: formData.get('weatherConditions') || ''
                },
                logistics: {
                    travelTime: formData.get('travelTime') || '30',
                    arrivalTime: formData.get('arrivalTime') || '',
                    hardConstraints: formData.get('hardConstraints') || ''
                },
                athlete: {
                    warmupDuration: formData.get('warmupDuration'),
                    caffeineTolerance: formData.get('caffeineTolerance') || 'none',
                    taperPreference: formData.get('taperPreference') || 'easy',
                    injuryConcerns: formData.get('injuryConcerns') || 'none',
                    notes: formData.get('notes') || ''
                }
            };

            console.log('Profile data to save:', profileData);

            // Generate timing spine
            const generator = new TimingSpineGenerator(profileData);
            const timingSpine = generator.generate();
            console.log('Timing spine generated:', timingSpine);

            // Save to localStorage
            profileManager.saveProfile(profileData);
            profileManager.saveTimingSpine(timingSpine);
            console.log('Profile saved to localStorage successfully');

            // Verify it was saved
            const saved = profileManager.getProfile();
            console.log('Verification - saved profile:', saved);

            if (!saved) {
                throw new Error('Failed to save profile to localStorage');
            }

            // Update UI
            console.log('About to hide setupScreen, show profileSummary and tabContainer');
            setupScreen.style.display = 'none';
            profileSummary.style.display = 'block';
            tabContainer.style.display = 'flex';
            console.log('UI visibility updated');

            console.log('Calling updateProfileSummary with:', profileData.race.name);
            updateProfileSummary(profileData);
            console.log('updateProfileSummary completed');

            console.log('Calling updateTabsWithTiming');
            updateTabsWithTiming(profileData, timingSpine);
            console.log('updateTabsWithTiming completed');

            // Show temporary success message
            const tempMsg = document.createElement('div');
            tempMsg.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 15px 30px; border-radius: 8px; z-index: 9999; font-weight: bold;';
            tempMsg.textContent = '✓ Profile saved! Loading your schedule...';
            document.body.appendChild(tempMsg);

            // Scroll to profile summary
            console.log('About to scroll to profileSummary');
            setTimeout(() => {
                console.log('Scrolling now, profileSummary element:', profileSummary);
                profileSummary.scrollIntoView({ behavior: 'smooth' });

                // Remove temp message after scroll
                setTimeout(() => {
                    tempMsg.remove();
                }, 2000);
            }, 100);

        } catch (error) {
            console.error('Error saving profile:', error);

            // Show big visible error message on page
            const errorBox = document.createElement('div');
            errorBox.style.cssText = 'position: fixed; top: 60px; left: 10px; right: 10px; background: #dc2626; color: white; padding: 20px; border-radius: 8px; z-index: 9999; font-weight: bold; font-size: 16px; word-wrap: break-word;';
            errorBox.innerHTML = '🔴 <strong>ERROR:</strong><br>' + error.message + '<br><br>Please fill in all required fields and try again.';
            document.body.appendChild(errorBox);

            // Remove error after 5 seconds
            setTimeout(() => { errorBox.remove(); }, 5000);

            alert('Error: ' + error.message + '\n\nPlease try again and make sure all fields are filled in.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
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
    initRaceDay(profile, profileManager.getTimingSpine());
});

// Initialize Race Day functionality
function initRaceDay(profile, timingSpine) {
    if (!profile || !timingSpine) return;

    const startBtn = document.getElementById('start-race-day-btn');
    const stopBtn = document.getElementById('stop-race-day-btn');
    const clockSection = document.getElementById('live-clock-section');
    const statusP = document.getElementById('race-day-status');
    const introSection = document.getElementById('timeline-intro-section');

    // Check if race day is already in progress
    const isRaceDayActive = localStorage.getItem('raceDayActive') === 'true';

    if (isRaceDayActive) {
        startRaceDayMode(profile, timingSpine);
    } else {
        startBtn.style.display = 'block';
    }

    // Start Race Day button
    startBtn.addEventListener('click', async () => {
        // Request notification permission
        const notifManager = new NotificationManager(timingSpine, null);
        await notifManager.requestPermission();

        localStorage.setItem('raceDayActive', 'true');
        startRaceDayMode(profile, timingSpine);
    });

    // Stop Race Day button
    stopBtn.addEventListener('click', () => {
        if (confirm('Stop Race Day mode? You can restart it anytime.')) {
            stopRaceDayMode();
        }
    });

    // Test mode controls
    setupTestModeControls();
}

// Start race day tracking
function startRaceDayMode(profile, timingSpine) {
    console.log('startRaceDayMode called with:', { profile, timingSpine });
    const startBtn = document.getElementById('start-race-day-btn');
    const stopBtn = document.getElementById('stop-race-day-btn');
    const clockSection = document.getElementById('live-clock-section');
    const statusP = document.getElementById('race-day-status');
    const introSection = document.getElementById('timeline-intro-section');

    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    stopBtn.textContent = '⏸️ Stop Race Day Mode';
    clockSection.style.display = 'block';
    statusP.style.display = 'block';
    introSection.style.display = 'none';

    // Create race timer
    console.log('Creating RaceTimer...');
    const raceTimer = new RaceTimer(profile, timingSpine);
    console.log('RaceTimer created:', raceTimer);
    console.log('Button press time:', raceTimer.buttonPressTime);

    // Add debug display on mobile
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-display';
    debugDiv.style.cssText = `
        position: fixed;
        top: 100px;
        left: 10px;
        right: 10px;
        background: #ffeb3b;
        border: 3px solid #ff5722;
        padding: 15px;
        font-size: 11px;
        z-index: 9999;
        color: black;
        max-height: 300px;
        overflow: auto;
        font-family: monospace;
        line-height: 1.6;
    `;
    const nowDate = new Date();
    debugDiv.innerHTML = `
        <strong style="font-size: 13px;">🔧 DEBUG:</strong><br>
        Profile Race Start: ${profile.race.startTime}<br>
        Button Pressed At: ${new Date(raceTimer.buttonPressTime).toLocaleTimeString()}<br>
        <strong>Raw Now:</strong> ${nowDate.toLocaleTimeString()}<br>
        <strong>getRaceStartTime:</strong> ${raceTimer.raceStartTime.toLocaleTimeString()}<br>
        <strong>Is Test Mode:</strong> ${raceTimer.isTestMode}<br>
        <strong>Test Speed:</strong> ${raceTimer.testSpeed}<br>
    `;
    document.body.appendChild(debugDiv);

    const notifManager = new NotificationManager(timingSpine, raceTimer);

    // Update display immediately
    console.log('Calling updateLiveClockDisplay...');
    updateLiveClockDisplay(raceTimer);
    notifManager.checkAndFire();

    // Update every 10 seconds
    let updateInterval = setInterval(() => {
        updateLiveClockDisplay(raceTimer);
        notifManager.checkAndFire();
    }, 10000); // Update every 10 seconds

    // Store interval ID for cleanup
    window.raceDayInterval = updateInterval;
    window.currentRaceTimer = raceTimer;
}

// Stop race day tracking
function stopRaceDayMode() {
    localStorage.setItem('raceDayActive', 'false');
    clearInterval(window.raceDayInterval);

    const startBtn = document.getElementById('start-race-day-btn');
    const stopBtn = document.getElementById('stop-race-day-btn');
    const clockSection = document.getElementById('live-clock-section');
    const statusP = document.getElementById('race-day-status');
    const introSection = document.getElementById('timeline-intro-section');

    startBtn.style.display = 'block';
    startBtn.textContent = '🟢 START RACE DAY';
    stopBtn.style.display = 'none';
    clockSection.style.display = 'none';
    statusP.style.display = 'none';
    introSection.style.display = 'block';
}

// Test mode controls
function setupTestModeControls() {
    // Add test mode dropdown to profile summary if it exists
    const profileSummary = document.getElementById('profile-summary');

    if (profileSummary && !document.getElementById('test-mode-controls')) {
        const testModeDiv = document.createElement('div');
        testModeDiv.id = 'test-mode-controls';
        testModeDiv.style.cssText = `
            padding: 15px 20px;
            background: #f9f9f9;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 0.9em;
        `;

        const isTestMode = localStorage.getItem('testMode') === 'true';
        testModeDiv.innerHTML = `
            <label style="color: #666; font-weight: 500;">
                🧪 Test Mode:
                <select id="test-mode-select" style="padding: 6px 10px; margin-left: 10px; border-radius: 4px; border: 1px solid #ddd;">
                    <option value="normal" ${!isTestMode ? 'selected' : ''}>Normal (Real Time)</option>
                    <option value="10x" ${isTestMode && localStorage.getItem('testSpeed') === '10' ? 'selected' : ''}>10x Speed</option>
                    <option value="60x" ${isTestMode && localStorage.getItem('testSpeed') === '60' ? 'selected' : ''}>60x Speed</option>
                </select>
            </label>
        `;

        profileSummary.appendChild(testModeDiv);

        // Handle test mode change
        document.getElementById('test-mode-select').addEventListener('change', (e) => {
            const value = e.target.value;

            if (value === 'normal') {
                localStorage.setItem('testMode', 'false');
            } else if (value === '10x') {
                localStorage.setItem('testMode', 'true');
                localStorage.setItem('testSpeed', '10');
            } else if (value === '60x') {
                localStorage.setItem('testMode', 'true');
                localStorage.setItem('testSpeed', '60');
            }

            // Update TEST MODE badge
            updateTestModeBadge();

            // Restart race day if active
            if (localStorage.getItem('raceDayActive') === 'true') {
                const profile = new ProfileManager().getProfile();
                const timingSpine = new ProfileManager().getTimingSpine();
                stopRaceDayMode();
                startRaceDayMode(profile, timingSpine);
            }
        });
    }

    // Show/hide TEST MODE badge based on current setting
    updateTestModeBadge();
}

// Update TEST MODE badge visibility
function updateTestModeBadge() {
    const badge = document.getElementById('test-mode-badge');
    if (badge) {
        const isTestMode = localStorage.getItem('testMode') === 'true';
        badge.style.display = isTestMode ? 'block' : 'none';
    }
}

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
                    <div class="timeline-action">
                        <label class="checkbox-item">
                            <input type="checkbox" class="race-day-activity-checkbox">
                            <span>Mark as done</span>
                        </label>
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
                        <div class="timeline-action">
                            <label class="checkbox-item">
                                <input type="checkbox" class="race-day-activity-checkbox">
                                <span>Mark as done</span>
                            </label>
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

// ==========================================
// PHASE 3: REAL-TIME RACE DAY TRACKING
// ==========================================

// Race Timer - manages real vs test time
class RaceTimer {
    constructor(profile, timingSpine) {
        this.profile = profile;
        this.timingSpine = timingSpine;
        this.raceStartTime = this.parseTime(profile.race.startTime);
        this.isTestMode = localStorage.getItem('testMode') === 'true';
        this.testSpeed = parseInt(localStorage.getItem('testSpeed')) || 10;
        this.buttonPressTime = Date.now();  // Track when Start Race Day was clicked
        this.updateInterval = null;
    }

    getCurrentTime() {
        try {
            const now = Date.now();

            // Validate buttonPressTime
            if (!this.buttonPressTime || isNaN(this.buttonPressTime)) {
                console.warn('Invalid buttonPressTime, using now');
                return new Date(now);
            }

            if (this.isTestMode) {
                // In test mode, time accelerates
                const elapsedMs = now - this.buttonPressTime;
                const testSpeedMultiplier = this.testSpeed || 10;
                const acceleratedMs = elapsedMs * testSpeedMultiplier;
                const resultTime = this.buttonPressTime + acceleratedMs;

                console.log('Test mode:', { elapsedMs, testSpeedMultiplier, acceleratedMs, resultTime });
                return new Date(resultTime);
            } else {
                // Normal mode: return current actual time
                const date = new Date(now);
                console.log('Normal mode - returning now:', date);
                return date;
            }
        } catch (error) {
            console.error('Error in getCurrentTime:', error);
            return new Date(); // Fallback to current time
        }
    }

    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    getCurrentActivity() {
        const currentTime = this.getCurrentTime();
        const raceStartMs = this.raceStartTime.getTime();
        const currentMs = currentTime.getTime();
        const minutesDiff = Math.floor((currentMs - raceStartMs) / 60000);

        // Find current activity
        let current = null;
        let next = null;

        const timeKeys = Object.keys(this.timingSpine).sort((a, b) => {
            const aMin = parseInt(a.split('_')[1]);
            const bMin = parseInt(b.split('_')[1]);
            return aMin - bMin;
        });

        for (let i = 0; i < timeKeys.length; i++) {
            const key = timeKeys[i];
            const block = this.timingSpine[key];
            const blockMinutes = block.minutes;

            if (minutesDiff >= blockMinutes) {
                current = { key, ...block };
            } else if (!next) {
                next = { key, ...block };
            }
        }

        return { current, next, minutesDiff };
    }

    getProgressPercent() {
        const { minutesDiff } = this.getCurrentActivity();
        const totalMinutes = 180; // T-180 to T-0 is 180 minutes
        const percent = Math.min(100, Math.max(0, ((totalMinutes - minutesDiff) / totalMinutes) * 100));
        return Math.round(percent);
    }

    getCountdownMinutes() {
        const { current, next, minutesDiff } = this.getCurrentActivity();
        if (!next) return 0;
        const countdown = next.minutes - minutesDiff;
        return Math.max(0, countdown);
    }

    formatTime(date) {
        try {
            // Ensure date is a valid Date object
            if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                console.error('Invalid date object:', date);
                return '--:-- --';
            }

            const hours = date.getHours();
            const minutes = date.getMinutes();

            // Validate hours and minutes are numbers
            if (typeof hours !== 'number' || typeof minutes !== 'number' || isNaN(hours) || isNaN(minutes)) {
                console.error('Invalid hours or minutes:', { hours, minutes });
                return '--:-- --';
            }

            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = String(minutes).padStart(2, '0');

            const result = `${displayHours}:${displayMinutes} ${ampm}`;
            console.log('formatTime result:', result, 'from date:', date);
            return result;
        } catch (error) {
            console.error('Error in formatTime:', error);
            return '--:-- --';
        }
    }
}

// Notification Manager
class NotificationManager {
    constructor(timingSpine, raceTimer) {
        this.timingSpine = timingSpine;
        this.raceTimer = raceTimer;
        this.notificationTimes = [60, 30, 15, 0]; // T-60, T-30, T-15, T-0
        this.firedNotifications = new Set();
        this.permissionAsked = localStorage.getItem('notificationPermissionAsked') === 'true';
    }

    async requestPermission() {
        if (!('Notification' in window)) return false;

        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;

        try {
            const permission = await Notification.requestPermission();
            localStorage.setItem('notificationPermissionAsked', 'true');
            return permission === 'granted';
        } catch (error) {
            console.error('Notification permission error:', error);
            return false;
        }
    }

    checkAndFire() {
        if (Notification.permission !== 'granted') return;

        const { minutesDiff } = this.raceTimer.getCurrentActivity();

        for (const time of this.notificationTimes) {
            const diff = Math.abs(180 - minutesDiff - time); // Minutes until this time

            // Fire notification when we're within 30 seconds of the target time
            if (diff < 0.5 && !this.firedNotifications.has(time)) {
                this.firedNotifications.add(time);
                this.fireNotification(time);
            }
        }
    }

    fireNotification(minutesUntilRace) {
        const message = this.getNotificationMessage(minutesUntilRace);
        new Notification('Race Day Prep', {
            body: message,
            icon: '🏃',
            badge: '🏃'
        });
    }

    getNotificationMessage(minutesUntilRace) {
        switch(minutesUntilRace) {
            case 60: return '⏰ Warm-up starts in 60 minutes!';
            case 30: return '⏰ Final mental prep in 30 minutes!';
            case 15: return '⏰ Race starts in 15 minutes!';
            case 0: return '🎯 GO! RACE TIME! You got this!';
            default: return 'Race time approaching!';
        }
    }
}

// Update live clock display
function updateLiveClockDisplay(raceTimer) {
    let current, next, minutesDiff;

    try {
        console.log('updateLiveClockDisplay called');

        // Get current time - with fallback to real time
        let currentTime = raceTimer.getCurrentTime();
        if (!currentTime || isNaN(currentTime.getTime())) {
            console.warn('Invalid time from RaceTimer, using real time');
            currentTime = new Date();
        }

        console.log('Current time from raceTimer:', currentTime);
        const formattedTime = raceTimer.formatTime(currentTime);
        console.log('Formatted time:', formattedTime);

        const activity = raceTimer.getCurrentActivity();
        current = activity.current;
        next = activity.next;
        minutesDiff = activity.minutesDiff;

        // Update clock - with error handling
        const clockElement = document.getElementById('live-clock-time');
        if (clockElement) {
            clockElement.textContent = formattedTime;
            console.log('Clock updated to:', clockElement.textContent);
        } else {
            console.error('Clock element not found!');
        }

        // Update debug display
        const debugDiv = document.getElementById('debug-display');
        if (debugDiv) {
            debugDiv.innerHTML += `<br><strong>Formatted:</strong> ${formattedTime}<br><strong>Activity:</strong> ${current ? current.label : 'none'}`;
        }
    } catch (error) {
        console.error('Error in updateLiveClockDisplay:', error);
        const clockElement = document.getElementById('live-clock-time');
        if (clockElement) {
            clockElement.textContent = new Date().toLocaleTimeString();
        }
    }

    // Update current activity
    if (current) {
        document.getElementById('current-activity-label').textContent = current.label;
        document.getElementById('current-activity-desc').textContent = current.action;
        document.getElementById('current-activity-time').textContent = `T-${current.minutes} min`;
    }

    // Update next activity
    if (next) {
        document.getElementById('next-activity-label').textContent = next.label;
        const countdown = raceTimer.getCountdownMinutes();
        const countdownText = countdown === 0 ? 'NOW' : `In ${countdown} minute${countdown !== 1 ? 's' : ''}`;
        document.getElementById('countdown-timer').textContent = countdownText;
    }

    // Update progress
    const progress = raceTimer.getProgressPercent();
    document.getElementById('progress-bar').style.width = progress + '%';
    document.getElementById('progress-text').textContent = `${progress}% complete`;
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
    // Clear old index-based localStorage keys to prevent conflicts
    for (let i = 0; i < 100; i++) {
        localStorage.removeItem(`checkbox-${i}`);
    }

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
        // Generate a stable unique ID for each checkbox
        // Use the parent's text content as a unique identifier
        let checkboxId = checkbox.getAttribute('data-checkbox-id');
        if (!checkboxId) {
            // Find the associated label or span text
            const label = checkbox.closest('label');
            if (label) {
                const labelText = label.textContent.trim().substring(0, 50); // First 50 chars
                checkboxId = 'checkbox-' + labelText.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            } else {
                checkboxId = 'checkbox-' + index;
            }
            checkbox.setAttribute('data-checkbox-id', checkboxId);
        }

        // Start all checkboxes unchecked
        checkbox.checked = false;

        // Restore saved state using stable ID (only if explicitly saved)
        const savedState = localStorage.getItem(checkboxId);
        if (savedState === 'true') {
            checkbox.checked = true;
        }

        checkbox.addEventListener('change', () => {
            localStorage.setItem(checkboxId, checkbox.checked);
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
