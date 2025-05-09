/**
 * Advanced Circle & Bar Segmentation Library
 */
class SegmentationVisualizer {
  constructor(canvasId, barId, pointersId, segmentStatsId, options = {}) {
    // Canvas elements for circular visualization
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Bar elements for linear visualization
    this.segmentBar = document.getElementById(barId);
    this.pointerContainer = document.getElementById(pointersId);
    
    // Segment stats container
    this.segmentStatsContainer = document.getElementById(segmentStatsId);
    
    // Default options
    this.options = {
      centerX: this.canvas.width / 2,
      centerY: this.canvas.height / 2,
      radius: Math.min(this.canvas.width, this.canvas.height) / 2 - 20,
      strokeColor: '#333',
      strokeWidth: 2,
      segments: 4,
      unitType: 'percent', // 'percent' or 'currency'
      totalValue: 1000,    // Total value for currency mode
      ...options
    };
    
    // Initialize segment data
    this.initSegments(this.options.segments);
    
    // Track current segment
    this.currentSegmentIndex = null;
    
    // Track pointer dragging
    this.dragState = {
      isDragging: false,
      pointerIndex: null,
      startX: 0,
      currentX: 0,
      barWidth: this.segmentBar.clientWidth
    };
    
    // Initialize both visualizations
    this.drawCircle();
    this.createSegmentBar();
    this.createPointers();
    this.createSegmentStats();
    
    // Set up event listeners for pointers
    this.setupPointerEvents();
    
    // Set up event listener for pie chart clicks
    this.setupPieChartClickEvent();
  }
  
  /**
   * Initialize segments with equal sizes and default colors
   */
  initSegments(count) {
    if (count < 2) count = 2; // At least 2 segments required for bar visualization
    
    const defaultColors = [
      '#FFB6C1', '#87CEFA', '#90EE90', '#FFA500', '#BA55D3', 
      '#F08080', '#7B68EE', '#20B2AA', '#FF6347', '#7FFF00'
    ];
    
    // Create equal size segments
    const equalSize = 100 / count;
    
    this.segments = [];
    for (let i = 0; i < count; i++) {
      this.segments.push({
        size: equalSize, // Percentage
        color: defaultColors[i % defaultColors.length]
      });
    }
    
    this.options.segments = count;
  }
  
  /**
   * Set up click event for pie chart segments
   */
  setupPieChartClickEvent() {
    this.canvas.addEventListener('click', (e) => {
      // Get click position relative to canvas
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate distance from center
      const { centerX, centerY, radius } = this.options;
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if click is within the circle
      if (distance <= radius) {
        // Calculate angle of click (0 to 2π)
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += Math.PI * 2; // Convert to 0-2π range
        
        // Find segment that contains this angle
        let currentAngle = 0;
        for (let i = 0; i < this.segments.length; i++) {
          const segmentAngle = (this.segments[i].size / 100) * Math.PI * 2;
          if (angle >= currentAngle && angle < currentAngle + segmentAngle) {
            // Found the clicked segment
            this.highlightSegment(i);
            break;
          }
          currentAngle += segmentAngle;
        }
      }
    });
  }
  
  /**
   * Set up event listeners for pointer dragging
   */
  setupPointerEvents() {
    // Mouse event handlers for pointer dragging
    const handleMouseMove = (e) => {
      if (!this.dragState.isDragging) return;
      
      const deltaX = e.clientX - this.dragState.startX;
      const percentDelta = (deltaX / this.dragState.barWidth) * 100;
      
      this.updateSegmentSizes(this.dragState.pointerIndex, percentDelta);
      this.dragState.startX = e.clientX;
      
      // Update visualizations
      this.drawCircle();
      this.updateSegmentBar();
      this.updatePointers();
      this.updateSegmentStats();
      
      e.preventDefault();
    };
    
    const handleMouseUp = () => {
      this.dragState.isDragging = false;
    };
    
    // Add global event listeners for dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Add pointer-specific mousedown events in createPointers method
  }
  
  /**
   * Update segment sizes when dragging pointers
   * @param {number} pointerIndex - Index of the pointer being dragged
   * @param {number} percentDelta - Percentage change to apply
   */
  updateSegmentSizes(pointerIndex, percentDelta) {
    // Pointers are between segments, so they affect 2 adjacent segments
    const leftSegmentIndex = pointerIndex;
    const rightSegmentIndex = pointerIndex + 1;
    
    // Don't allow segments to go below minimum size (1%)
    const minSize = 1;
    
    // Calculate new sizes
    let leftNewSize = this.segments[leftSegmentIndex].size + percentDelta;
    let rightNewSize = this.segments[rightSegmentIndex].size - percentDelta;
    
    // Enforce minimum size constraints
    if (leftNewSize < minSize) {
      const correction = minSize - leftNewSize;
      leftNewSize = minSize;
      rightNewSize -= correction;
    }
    
    if (rightNewSize < minSize) {
      const correction = minSize - rightNewSize;
      rightNewSize = minSize;
      leftNewSize -= correction;
    }
    
    // Update segment sizes
    this.segments[leftSegmentIndex].size = leftNewSize;
    this.segments[rightSegmentIndex].size = rightNewSize;
  }
  
  /**
   * Set the number of segments
   */
  setSegmentCount(count) {
    if (count < 2) count = 2; // Minimum 2 segments for bar visualization
    
    // Save colors of existing segments
    const oldSegments = [...this.segments];
    
    // Create new segments array with equal sizes
    this.initSegments(count);
    
    // Copy colors from old segments where possible
    for (let i = 0; i < Math.min(count, oldSegments.length); i++) {
      this.segments[i].color = oldSegments[i].color;
    }
    
    // Redraw everything
    this.drawCircle();
    this.createSegmentBar();
    this.createPointers();
    this.createSegmentStats();
    
    // Reset current segment if it's now out of bounds
    if (this.currentSegmentIndex >= count) {
      this.currentSegmentIndex = null;
    }
  }
  
  /**
   * Set color for a specific segment
   */
  setSegmentColor(segmentIndex, color) {
    if (segmentIndex >= 0 && segmentIndex < this.segments.length) {
      this.segments[segmentIndex].color = color;
      this.drawCircle();
      this.updateSegmentBar();
      this.updateSegmentStats();
    }
  }
  
  /**
   * Draw the segmented circle
   */
  drawCircle() {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const { centerX, centerY, radius } = this.options;
    
    // Draw segments
    let startAngle = 0;
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const endAngle = startAngle + (segment.size / 100) * Math.PI * 2;
      
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.closePath();
      
      this.ctx.fillStyle = segment.color;
      this.ctx.fill();
      
      this.ctx.lineWidth = this.options.strokeWidth;
      this.ctx.strokeStyle = this.options.strokeColor;
      this.ctx.stroke();
      
      startAngle = endAngle;
    }
    
    // Draw highlight for currently selected segment if any
    if (this.currentSegmentIndex !== null) {
      startAngle = 0;
      for (let i = 0; i < this.currentSegmentIndex; i++) {
        startAngle += (this.segments[i].size / 100) * Math.PI * 2;
      }
      
      const endAngle = startAngle + (this.segments[this.currentSegmentIndex].size / 100) * Math.PI * 2;
      
      // Draw highlight
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius + 5, startAngle, endAngle);
      this.ctx.closePath();
      
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.stroke();
    }
  }
  
  /**
   * Create the segmented bar visualization
   */
  createSegmentBar() {
    // Clear existing segments
    this.segmentBar.innerHTML = '';
    
    // Create segment sections
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const section = document.createElement('div');
      section.className = 'segment-bar-section';
      section.style.width = segment.size + '%';
      section.style.backgroundColor = segment.color;
      this.segmentBar.appendChild(section);
    }
  }
  
  /**
   * Update the segment bar visualization (without recreating)
   */
  updateSegmentBar() {
    const sections = this.segmentBar.querySelectorAll('.segment-bar-section');
    for (let i = 0; i < sections.length; i++) {
      sections[i].style.width = this.segments[i].size + '%';
      sections[i].style.backgroundColor = this.segments[i].color;
    }
  }
  
  /**
   * Create the draggable pointers
   */
  createPointers() {
    // Clear existing pointers
    this.pointerContainer.innerHTML = '';
    
    // We need n-1 pointers for n segments
    let cumulativePercent = 0;
    
    for (let i = 0; i < this.segments.length - 1; i++) {
      cumulativePercent += this.segments[i].size;
      
      // Create pointer and line
      const pointer = document.createElement('div');
      pointer.className = 'pointer';
      pointer.style.left = cumulativePercent + '%';
      
      const line = document.createElement('div');
      line.className = 'pointer-line';
      line.style.left = cumulativePercent + '%';
      
      // Add mouse down event handler
      pointer.addEventListener('mousedown', (e) => {
        this.handlePointerMouseDown(e, i);
      });
      
      this.pointerContainer.appendChild(pointer);
      this.pointerContainer.appendChild(line);
    }
  }
  
  /**
   * Update pointer positions
   */
  updatePointers() {
    const pointers = this.pointerContainer.querySelectorAll('.pointer');
    const lines = this.pointerContainer.querySelectorAll('.pointer-line');
    
    let cumulativePercent = 0;
    
    for (let i = 0; i < this.segments.length - 1; i++) {
      cumulativePercent += this.segments[i].size;
      
      pointers[i].style.left = cumulativePercent + '%';
      lines[i].style.left = cumulativePercent + '%';
    }
  }
  
  /**
   * Handle pointer mouse down event
   */
  handlePointerMouseDown(e, index) {
    this.dragState.isDragging = true;
    this.dragState.pointerIndex = index;
    this.dragState.startX = e.clientX;
    this.dragState.barWidth = this.segmentBar.clientWidth;
    e.preventDefault();
  }
  
  /**
   * Create segment stats display
   */
  createSegmentStats() {
    // Clear existing stats
    this.segmentStatsContainer.innerHTML = '';
    
    // Create stats display for each segment
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      
      // Create container for segment stats
      const statItem = document.createElement('div');
      statItem.className = 'segment-stat-item';
      statItem.dataset.index = i;
      
      // Create color indicator
      const colorIndicator = document.createElement('div');
      colorIndicator.className = 'segment-color-indicator';
      colorIndicator.style.backgroundColor = segment.color;
      
      // Create label
      const label = document.createElement('div');
      label.className = 'segment-label';
      label.textContent = `Segment ${i + 1}:`;
      
      // Create size value
      const sizeValue = document.createElement('div');
      sizeValue.className = 'segment-size-value';
      sizeValue.textContent = this.formatSize(segment.size);
      
      // Add click event to select this segment
      statItem.addEventListener('click', () => {
        this.highlightSegment(i);
      });
      
      // Assemble stat item
      statItem.appendChild(colorIndicator);
      statItem.appendChild(label);
      statItem.appendChild(sizeValue);
      
      this.segmentStatsContainer.appendChild(statItem);
    }
  }
  
  /**
   * Update segment stats display
   */
  updateSegmentStats() {
    const statItems = this.segmentStatsContainer.querySelectorAll('.segment-stat-item');
    
    // Update stats for each segment
    for (let i = 0; i < this.segments.length && i < statItems.length; i++) {
      const segment = this.segments[i];
      const statItem = statItems[i];
      
      // Update color indicator
      const colorIndicator = statItem.querySelector('.segment-color-indicator');
      colorIndicator.style.backgroundColor = segment.color;
      
      // Update size value
      const sizeValue = statItem.querySelector('.segment-size-value');
      sizeValue.textContent = this.formatSize(segment.size);
      
      // Highlight if this is the current segment
      if (i === this.currentSegmentIndex) {
        statItem.classList.add('selected-segment');
      } else {
        statItem.classList.remove('selected-segment');
      }
    }
  }
  
  /**
   * Format size based on unit type
   */
  formatSize(size) {
    if (this.options.unitType === 'percent') {
      return size.toFixed(1) + '%';
    } else {
      // Calculate currency amount based on percentage
      const amount = (size / 100) * this.options.totalValue;
      return amount.toFixed(2) + ' €';
    }
  }
  
  /**
   * Highlight a segment
   */
  highlightSegment(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= this.segments.length) return;
    
    this.currentSegmentIndex = segmentIndex;
    
    // Update the segment display
    const currentSegmentDisplay = document.getElementById('currentSegment');
    if (currentSegmentDisplay) {
      currentSegmentDisplay.textContent = this.currentSegmentIndex + 1;
    }
    
    // Update size display
    const sizeDisplay = document.getElementById('segmentSize');
    if (sizeDisplay) {
      sizeDisplay.textContent = this.formatSize(this.segments[segmentIndex].size);
    }
    
    // Redraw circle with highlight
    this.drawCircle();
    
    // Update segment stats highlighting
    this.updateSegmentStats();
  }
  
  /**
   * Set unit type (percent or currency)
   */
  setUnitType(unitType, totalValue = null) {
    this.options.unitType = unitType;
    
    if (totalValue !== null) {
      this.options.totalValue = totalValue;
    }
    
    // Update all segment stats
    this.updateSegmentStats();
    
    // Update the current segment display if one is selected
    if (this.currentSegmentIndex !== null) {
      const sizeDisplay = document.getElementById('segmentSize');
      if (sizeDisplay) {
        sizeDisplay.textContent = this.formatSize(this.segments[this.currentSegmentIndex].size);
      }
    }
  }
}

/**
 * Main application logic
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the visualization
  const visualizer = new SegmentationVisualizer(
    'myCanvas', 
    'segmentBar', 
    'pointerContainer',
    'segmentStats',
    { segments: 4 }
  );
  
  // DOM elements
  const segmentCountInput = document.getElementById('segments');
  const currentSegmentDisplay = document.getElementById('currentSegment');
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const unitTypeSelect = document.getElementById('unitType');
  const totalValueInput = document.getElementById('totalValue');
  
  // Select the first segment by default
  visualizer.highlightSegment(0);
  
  // Set up event listeners
  
  // Segment count change
  segmentCountInput.addEventListener('change', () => {
    const count = parseInt(segmentCountInput.value, 10);
    if (count >= 2) {
      visualizer.setSegmentCount(count);
    }
  });
  
  // Color selection
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      // Update selected color UI
      colorSwatches.forEach(selectedSwatch => {
        selectedSwatch.classList.remove('selected-color')
      });
      
      swatch.classList.add('selected-color');
      
      // Get and apply the selected color
      const currentColor = swatch.getAttribute('data-color');
      visualizer.setSegmentColor(visualizer.currentSegmentIndex, currentColor);
    });
  });
  
  // Unit type change
  unitTypeSelect.addEventListener('change', () => {
    const unitType = unitTypeSelect.value;
    const totalValue = parseFloat(totalValueInput.value) || 1000;
    
    // Show/hide total value input for currency mode
    if (unitType === 'currency') {
      totalValueInput.classList.remove('hidden');
    } else {
      totalValueInput.classList.add('hidden');
    }
    
    visualizer.setUnitType(unitType, totalValue);
  });
  
  // Total value change
  totalValueInput.addEventListener('change', () => {
    const totalValue = parseFloat(totalValueInput.value) || 1000;
    visualizer.setUnitType('currency', totalValue);
  });
});