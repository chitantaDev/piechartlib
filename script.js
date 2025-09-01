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
      segments: 5, // Changed to 5 for our default segments
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
    
    // Set up event listeners for pie chart
    this.setupPieChartClickEvent();
    this.setupPieChartHoverEvent();
  }
  
  /**
   * Initialize segments with predefined sizes and names
   */
  initSegments(count) {
    // Define default segments
    const defaultSegments = [
      { name: 'Needs: Rent', size: 30, color: '#FF6B6B' },  // Warm red for essential needs
      { name: 'Needs: Else', size: 20, color: '#4ECDC4' },  // Teal for other needs
      { name: 'Wants', size: 30, color: '#45B7D1' },        // Blue for wants
      { name: 'Debt', size: 10, color: '#96CEB4' },         // Soft green for debt
      { name: 'Investment', size: 10, color: '#FFBE0B' }    // Gold for investments
    ];

    const defaultColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFBE0B',
      '#FF8066', '#4EA8DE', '#9B89B3', '#98C1D9', '#FFD93D'
    ];
    
    this.segments = [];
    
    if (count <= defaultSegments.length) {
      // Use the first 'count' default segments
      this.segments = defaultSegments.slice(0, count);
    } else {
      // Use all default segments and add extra ones with equal distribution of remaining percentage
      this.segments = [...defaultSegments];
      const remainingCount = count - defaultSegments.length;
      const remainingSize = Math.max(0, 100 - defaultSegments.reduce((sum, seg) => sum + seg.size, 0));
      const extraSize = remainingSize / remainingCount;
      
      for (let i = defaultSegments.length; i < count; i++) {
        this.segments.push({
          size: extraSize,
          color: defaultColors[i % defaultColors.length],
          name: `Segment ${i + 1}`
        });
      }
    }
    
    this.options.segments = count;
  }
  
  /**
   * Get the segment index at a specific point on the canvas
   */
  getSegmentAtPoint(x, y) {
    const { centerX, centerY, radius } = this.options;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if point is within the circle
    if (distance <= radius) {
      // Calculate angle (0 to 2π)
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;
      
      // Find segment that contains this angle
      let currentAngle = 0;
      for (let i = 0; i < this.segments.length; i++) {
        const segmentAngle = (this.segments[i].size / 100) * Math.PI * 2;
        if (angle >= currentAngle && angle < currentAngle + segmentAngle) {
          return i;
        }
        currentAngle += segmentAngle;
      }
    }
    return null;
  }

  /**
   * Set up click event for pie chart segments
   */
  setupPieChartClickEvent() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const segmentIndex = this.getSegmentAtPoint(x, y);
      if (segmentIndex !== null) {
        this.highlightSegment(segmentIndex);
      }
    });
  }

  /**
   * Set up hover event for pie chart segments
   */
  setupPieChartHoverEvent() {
    let hoveredSegment = null;

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const segmentIndex = this.getSegmentAtPoint(x, y);
      if (segmentIndex !== hoveredSegment) {
        hoveredSegment = segmentIndex;
        this.drawCircle(hoveredSegment);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      hoveredSegment = null;
      this.drawCircle(null);
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
    
    // Save existing segments
    const oldSegments = [...this.segments];
    const oldCount = oldSegments.length;
    
    if (count > oldCount) {
      // Adding segments
      const equalSize = oldSegments.reduce((total, seg) => total - seg.size, 100) / (count - oldCount);
      const defaultColors = [
        '#FFB6C1', '#87CEFA', '#90EE90', '#FFA500', '#BA55D3', 
        '#F08080', '#7B68EE', '#20B2AA', '#FF6347', '#7FFF00'
      ];
      
      // Keep existing segments and add new ones
      this.segments = [...oldSegments];
      for (let i = oldCount; i < count; i++) {
        this.segments.push({
          size: equalSize,
          color: defaultColors[i % defaultColors.length],
          name: `Segment ${i + 1}`
        });
      }
    } else {
      // Removing segments
      this.segments = oldSegments.slice(0, count);
      
      // Redistribute the remaining space proportionally
      const totalSize = this.segments.reduce((total, seg) => total + seg.size, 0);
      if (totalSize < 100) {
        const factor = 100 / totalSize;
        this.segments.forEach(seg => seg.size *= factor);
      }
    }
    
    this.options.segments = count;
    
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
  drawCircle(hoveredSegment = null) {
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

      // If this is the hovered segment, show the name
      if (hoveredSegment === i) {
        const midAngle = startAngle + (endAngle - startAngle) / 2;
        const textX = centerX + Math.cos(midAngle) * (radius * 0.7);
        const textY = centerY + Math.sin(midAngle) * (radius * 0.7);
        
        this.ctx.save();
        // Draw text shadow for better readability
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Use a nicer font
        this.ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw text with a subtle glow
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(segment.name, textX, textY);
        
        this.ctx.restore();
      }
      
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
      statItem.draggable = true;
      
      // Create color indicator
      const colorIndicator = document.createElement('div');
      colorIndicator.className = 'segment-color-indicator';
      colorIndicator.style.backgroundColor = segment.color;
      
      // Create label container
      const labelContainer = document.createElement('div');
      labelContainer.className = 'segment-label-container';
      
      const label = document.createElement('input');
      label.type = 'text';
      label.className = 'segment-label';
      label.value = segment.name;
      label.readOnly = true;
      
      const editButton = document.createElement('button');
      editButton.className = 'edit-button';
      editButton.textContent = 'Edit';
      
      const startEditing = (e) => {
        e.stopPropagation();
        label.readOnly = false;
        label.focus();
        editButton.style.display = 'none';
        // Temporarily disable dragging while editing
        statItem.draggable = false;
      };
      
      // Only enable editing through the edit button
      editButton.onclick = startEditing;
      
      // Save on enter or blur
      const saveChanges = () => {
        label.readOnly = true;
        editButton.style.display = '';
        statItem.draggable = true; // Re-enable dragging
        const newName = label.value.trim();
        if (newName) {
          segment.name = newName;
          this.drawCircle(); // Redraw in case this segment is being hovered
        } else {
          label.value = segment.name;
        }
      };
      
      label.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveChanges();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          label.value = segment.name;
          label.readOnly = true;
          editButton.style.display = '';
          statItem.draggable = true; // Re-enable dragging
        }
      };
      
      label.onblur = saveChanges;
      
      labelContainer.appendChild(label);
      labelContainer.appendChild(editButton);
      
      // Create size value
      const sizeValue = document.createElement('div');
      sizeValue.className = 'segment-size-value';
      sizeValue.textContent = this.formatSize(segment.size);
      sizeValue.style.color = segment.color;
      
      // Add click event to select this segment
      statItem.addEventListener('click', () => {
        if (!label.readOnly) return; // Don't select while editing
        this.highlightSegment(i);
      });
      
      // Add drag and drop events
      statItem.addEventListener('dragstart', (e) => {
        if (!label.readOnly) {
          e.preventDefault();
          return;
        }
        statItem.classList.add('dragging');
        e.dataTransfer.setData('text/plain', i.toString());
      });
      
      statItem.addEventListener('dragend', () => {
        statItem.classList.remove('dragging');
      });
      
      statItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = this.segmentStatsContainer.querySelector('.dragging');
        if (draggingItem && draggingItem !== statItem) {
          const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
          const dropIndex = parseInt(statItem.dataset.index);
          if (draggedIndex !== dropIndex) {
            statItem.classList.add('drag-over');
          }
        }
      });
      
      statItem.addEventListener('dragleave', () => {
        statItem.classList.remove('drag-over');
      });
      
      statItem.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const dropIndex = parseInt(statItem.dataset.index);
        
        if (draggedIndex !== dropIndex) {
          // Reorder segments
          const [movedSegment] = this.segments.splice(draggedIndex, 1);
          this.segments.splice(dropIndex, 0, movedSegment);
          
          // Update all visualizations
          this.drawCircle();
          this.createSegmentBar();
          this.createPointers();
          this.createSegmentStats();
          
          // Update current segment index if needed
          if (this.currentSegmentIndex === draggedIndex) {
            this.currentSegmentIndex = dropIndex;
          } else if (this.currentSegmentIndex > draggedIndex && this.currentSegmentIndex <= dropIndex) {
            this.currentSegmentIndex--;
          } else if (this.currentSegmentIndex < draggedIndex && this.currentSegmentIndex >= dropIndex) {
            this.currentSegmentIndex++;
          }
        }
        
        statItem.classList.remove('drag-over');
      });
      
      // Assemble stat item
      statItem.appendChild(colorIndicator);
      statItem.appendChild(labelContainer);
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
      sizeValue.style.color = segment.color;
      
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
    const amount = (size / 100) * this.options.totalValue;
    return `${amount.toFixed(2)}\u20AC (${size.toFixed(1)}%)`;
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
    { segments: 5 }
  );
  
  // DOM elements
  const segmentCountInput = document.getElementById('segments');
  const currentSegmentDisplay = document.getElementById('currentSegment');
  const colorPicker = document.getElementById('colorPicker');
  const colorPreview = document.getElementById('colorPreview');
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
  colorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    colorPreview.style.setProperty('--selected-color', color);
    if (visualizer.currentSegmentIndex !== null) {
      visualizer.setSegmentColor(visualizer.currentSegmentIndex, color);
    }
  });
  
  // Update color picker when selecting a segment
  const originalHighlightSegment = visualizer.highlightSegment;
  visualizer.highlightSegment = (segmentIndex) => {
    originalHighlightSegment.call(visualizer, segmentIndex);
    if (segmentIndex !== null) {
      const segmentColor = visualizer.segments[segmentIndex].color;
      colorPicker.value = segmentColor;
      colorPreview.style.setProperty('--selected-color', segmentColor);
    }
  };
  
  // Total value change
  totalValueInput.addEventListener('change', () => {
    const totalValue = parseFloat(totalValueInput.value) || 1000;
    visualizer.options.totalValue = totalValue;
    visualizer.updateSegmentStats();
    
    // Update current segment display if one is selected
    if (visualizer.currentSegmentIndex !== null) {
      const sizeDisplay = document.getElementById('segmentSize');
      if (sizeDisplay) {
        sizeDisplay.textContent = visualizer.formatSize(visualizer.segments[visualizer.currentSegmentIndex].size);
      }
    }
  });
});
