/**
 * StrokeAnalyzer.js
 * Real-time analysis of drawing strokes for AI training
 * Detects: burst vs deliberate mode, speed, pressure patterns, stroke types
 */

(function(window) {
    'use strict';

    var StrokeAnalyzer = {
        currentStroke: [],
        allStrokes: [],
        sessionStats: {
            totalStrokes: 0,
            burstStrokes: 0,
            deliberateStrokes: 0,
            avgSpeed: 0,
            avgPressure: 0,
            totalDistance: 0,
            startTime: Date.now()
        },

        /**
         * Analyze a single stroke
         */
        analyzeStroke: function(strokePoints) {
            if (strokePoints.length < 2) {
                return null;
            }

            var analysis = {
                points: strokePoints.length,
                duration: this.getStrokeDuration(strokePoints),
                distance: this.getStrokeDistance(strokePoints),
                avgSpeed: 0,
                avgPressure: 0,
                pressureVariance: 0,
                tempo: 'unknown',
                type: 'unknown',
                curvature: 0,
                confidence: 0
            };

            // Calculate average speed
            analysis.avgSpeed = analysis.distance / (analysis.duration / 1000);

            // Calculate average pressure
            var pressures = strokePoints.map(function(p) {
                return p.pressure || 0.5;
            });
            analysis.avgPressure = this.average(pressures);
            analysis.pressureVariance = this.variance(pressures);

            // Determine tempo (burst vs deliberate)
            var timings = [];
            for (var i = 1; i < strokePoints.length; i++) {
                var dt = strokePoints[i].timestamp - strokePoints[i-1].timestamp;
                timings.push(dt);
            }
            var avgTiming = this.average(timings);

            // Burst: fast strokes (< 30ms between points)
            // Deliberate: slow strokes (> 50ms between points)
            if (avgTiming < 30) {
                analysis.tempo = 'burst';
            } else if (avgTiming > 50) {
                analysis.tempo = 'deliberate';
            } else {
                analysis.tempo = 'normal';
            }

            // Calculate curvature
            analysis.curvature = this.calculateCurvature(strokePoints);

            // Classify stroke type
            analysis.type = this.classifyStrokeType(analysis);

            // Confidence based on pressure variance (low variance = confident)
            analysis.confidence = 1 - Math.min(analysis.pressureVariance, 1);

            return analysis;
        },

        /**
         * Get stroke duration in milliseconds
         */
        getStrokeDuration: function(strokePoints) {
            if (strokePoints.length < 2) return 0;
            return strokePoints[strokePoints.length - 1].timestamp - strokePoints[0].timestamp;
        },

        /**
         * Get stroke distance (path length)
         */
        getStrokeDistance: function(strokePoints) {
            var distance = 0;
            for (var i = 1; i < strokePoints.length; i++) {
                var dx = strokePoints[i].x - strokePoints[i-1].x;
                var dy = strokePoints[i].y - strokePoints[i-1].y;
                distance += Math.sqrt(dx * dx + dy * dy);
            }
            return distance;
        },

        /**
         * Calculate curvature of stroke
         */
        calculateCurvature: function(strokePoints) {
            if (strokePoints.length < 3) return 0;

            var angles = [];
            for (var i = 1; i < strokePoints.length - 1; i++) {
                var p0 = strokePoints[i - 1];
                var p1 = strokePoints[i];
                var p2 = strokePoints[i + 1];

                var angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
                var angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                var deltaAngle = Math.abs(angle2 - angle1);

                // Normalize to [0, PI]
                if (deltaAngle > Math.PI) {
                    deltaAngle = 2 * Math.PI - deltaAngle;
                }

                angles.push(deltaAngle);
            }

            return this.average(angles);
        },

        /**
         * Classify stroke type based on analysis
         */
        classifyStrokeType: function(analysis) {
            // Straight line: low curvature, high speed
            if (analysis.curvature < 0.2 && analysis.avgSpeed > 100) {
                return 'line';
            }

            // Curve: moderate curvature
            if (analysis.curvature > 0.2 && analysis.curvature < 1.0) {
                return 'curve';
            }

            // Circle/loop: high curvature, moderate speed
            if (analysis.curvature > 1.0) {
                return 'circle';
            }

            // Hatch: short, fast strokes
            if (analysis.distance < 50 && analysis.tempo === 'burst') {
                return 'hatch';
            }

            return 'unknown';
        },

        /**
         * Update session statistics
         */
        updateSessionStats: function(strokeAnalysis) {
            if (!strokeAnalysis) return;

            this.sessionStats.totalStrokes++;

            if (strokeAnalysis.tempo === 'burst') {
                this.sessionStats.burstStrokes++;
            } else if (strokeAnalysis.tempo === 'deliberate') {
                this.sessionStats.deliberateStrokes++;
            }

            // Running average for speed and pressure
            var n = this.sessionStats.totalStrokes;
            this.sessionStats.avgSpeed =
                ((this.sessionStats.avgSpeed * (n - 1)) + strokeAnalysis.avgSpeed) / n;
            this.sessionStats.avgPressure =
                ((this.sessionStats.avgPressure * (n - 1)) + strokeAnalysis.avgPressure) / n;

            this.sessionStats.totalDistance += strokeAnalysis.distance;
        },

        /**
         * Get current drawing mode based on recent strokes
         */
        getCurrentMode: function() {
            var recentStrokes = this.allStrokes.slice(-10); // Last 10 strokes
            if (recentStrokes.length === 0) return 'idle';

            var burstCount = 0;
            var deliberateCount = 0;

            recentStrokes.forEach(function(stroke) {
                if (stroke.tempo === 'burst') burstCount++;
                if (stroke.tempo === 'deliberate') deliberateCount++;
            });

            if (burstCount > deliberateCount * 2) {
                return 'burst';
            } else if (deliberateCount > burstCount * 2) {
                return 'deliberate';
            } else {
                return 'mixed';
            }
        },

        /**
         * Update UI with current stats
         */
        updateUI: function() {
            var mode = this.getCurrentMode();
            var modeText = mode.charAt(0).toUpperCase() + mode.slice(1);

            if (mode === 'burst') {
                modeText = '<span class="mode-badge mode-burst">Burst</span>';
            } else if (mode === 'deliberate') {
                modeText = '<span class="mode-badge mode-deliberate">Deliberate</span>';
            }

            document.getElementById('strokeMode').innerHTML = modeText;
            document.getElementById('strokeCount').textContent = this.sessionStats.totalStrokes;
            document.getElementById('avgSpeed').textContent =
                Math.round(this.sessionStats.avgSpeed) + ' px/s';
            document.getElementById('avgPressure').textContent =
                (this.sessionStats.avgPressure * 100).toFixed(0) + '%';
        },

        /**
         * Utility: calculate average
         */
        average: function(arr) {
            if (arr.length === 0) return 0;
            var sum = arr.reduce(function(a, b) { return a + b; }, 0);
            return sum / arr.length;
        },

        /**
         * Utility: calculate variance
         */
        variance: function(arr) {
            if (arr.length === 0) return 0;
            var avg = this.average(arr);
            var squareDiffs = arr.map(function(value) {
                var diff = value - avg;
                return diff * diff;
            });
            return this.average(squareDiffs);
        },

        /**
         * Detect patterns across multiple strokes
         */
        detectPatterns: function() {
            if (this.allStrokes.length < 5) return [];

            var patterns = [];

            // Pattern 1: Repeated stroke type
            var recentTypes = this.allStrokes.slice(-5).map(function(s) { return s.type; });
            var typeFreq = {};
            recentTypes.forEach(function(type) {
                typeFreq[type] = (typeFreq[type] || 0) + 1;
            });

            for (var type in typeFreq) {
                if (typeFreq[type] >= 3) {
                    patterns.push({
                        type: 'repetition',
                        description: 'Repeated ' + type + ' strokes',
                        confidence: typeFreq[type] / 5
                    });
                }
            }

            // Pattern 2: Rhythm detection
            var recentDurations = this.allStrokes.slice(-5).map(function(s) { return s.duration; });
            var durationVariance = this.variance(recentDurations);
            if (durationVariance < 100) {
                patterns.push({
                    type: 'rhythm',
                    description: 'Consistent rhythm detected',
                    confidence: 1 - (durationVariance / 100)
                });
            }

            // Pattern 3: Pressure consistency
            var recentPressures = this.allStrokes.slice(-5).map(function(s) { return s.avgPressure; });
            var pressureVariance = this.variance(recentPressures);
            if (pressureVariance < 0.01) {
                patterns.push({
                    type: 'pressure_control',
                    description: 'Very consistent pressure',
                    confidence: 1 - (pressureVariance / 0.01)
                });
            }

            return patterns;
        },

        /**
         * Export analysis data for training
         */
        exportAnalysis: function() {
            return {
                strokes: this.allStrokes,
                sessionStats: this.sessionStats,
                patterns: this.detectPatterns(),
                summary: {
                    totalStrokes: this.sessionStats.totalStrokes,
                    avgSpeed: this.sessionStats.avgSpeed,
                    avgPressure: this.sessionStats.avgPressure,
                    totalDistance: this.sessionStats.totalDistance,
                    duration: Date.now() - this.sessionStats.startTime,
                    burstRatio: this.sessionStats.burstStrokes / this.sessionStats.totalStrokes,
                    deliberateRatio: this.sessionStats.deliberateStrokes / this.sessionStats.totalStrokes
                }
            };
        },

        /**
         * Reset analyzer
         */
        reset: function() {
            this.currentStroke = [];
            this.allStrokes = [];
            this.sessionStats = {
                totalStrokes: 0,
                burstStrokes: 0,
                deliberateStrokes: 0,
                avgSpeed: 0,
                avgPressure: 0,
                totalDistance: 0,
                startTime: Date.now()
            };
            this.updateUI();
        }
    };

    // Make available globally
    window.StrokeAnalyzer = StrokeAnalyzer;

})(window);
