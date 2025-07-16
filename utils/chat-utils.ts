/**
 * Chat utility functions
 */

/**
 * Generate unique ID function
 * @param prefix ID prefix
 * @returns Unique ID string
 */
export const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Scroll to bottom instantly
 * @param container Scroll container element
 * @param isScrollingToBottom Reference to scroll state
 * @param lastScrollHeight Reference to last scroll height
 */
export const scrollToBottomInstant = (
  container: HTMLDivElement | null,
  isScrollingToBottom: React.MutableRefObject<boolean>,
  lastScrollHeight: React.MutableRefObject<number>
): void => {
  if (container) {
    isScrollingToBottom.current = true;
    
    // Calculate latest scroll height
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    container.scrollTop = Math.max(0, maxScrollTop);
    lastScrollHeight.current = container.scrollHeight;
  }
};

/**
 * Scroll to bottom smoothly
 * @param container Scroll container element
 * @param isScrollingToBottom Reference to scroll state
 * @param lastScrollHeight Reference to last scroll height
 * @param force Force scroll
 */
export const scrollToBottomSmooth = (
  container: HTMLDivElement | null,
  isScrollingToBottom: React.MutableRefObject<boolean>,
  lastScrollHeight: React.MutableRefObject<number>,
  force: boolean = false
): void => {
  if (container && !isScrollingToBottom.current) {
    const newScrollHeight = container.scrollHeight;
    
    // If scroll height doesn't change, don't scroll (ignore if force is true)
    if (!force && newScrollHeight <= lastScrollHeight.current + 10) {
      return;
    }
    
    isScrollingToBottom.current = true;
    lastScrollHeight.current = newScrollHeight;
    
    // Calculate actual maximum scroll position
    const maxScrollTop = Math.max(0, newScrollHeight - container.clientHeight);
    
    // Smooth scroll
    container.scrollTo({
      top: maxScrollTop,
      behavior: 'smooth'
    });
    
    // Check multiple times after scroll completion
    setTimeout(() => {
      const currentMaxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      if (container.scrollTop < currentMaxScrollTop - 20) {
        container.scrollTop = currentMaxScrollTop;
      }
      
      // Check again
      setTimeout(() => {
        const finalMaxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        if (container.scrollTop < finalMaxScrollTop - 20) {
          container.scrollTop = finalMaxScrollTop;
        }
        isScrollingToBottom.current = false;
      }, 300);
    }, 600); // Wait for animation completion
  }
};

/**
 * Add timeout to fetch function
 * @param url Request URL
 * @param options Fetch options
 * @param timeoutMs Timeout (ms)
 * @returns Response object
 */
export const fetchWithTimeout = async (
  url: string, 
  options: RequestInit, 
  timeoutMs: number = 60000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}; 