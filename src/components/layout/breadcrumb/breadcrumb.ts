import { init } from '@/lib/classes';

class BreadcrumbDropdown {
	private dropdown: HTMLElement;
	private trigger: HTMLElement;
	private content: HTMLElement;
	private items: HTMLElement[];
	private isOpen: boolean = false;

	constructor(dropdown: HTMLElement) {
		this.dropdown = dropdown;
		this.trigger = dropdown.querySelector('[data-dropdown-trigger]') as HTMLElement;
		this.content = dropdown.querySelector('[data-dropdown-content]') as HTMLElement;
		this.items = Array.from(this.content.querySelectorAll('[role="menuitem"]')) as HTMLElement[];

		this.init();
	}

	private init() {
		// Toggle on click
		this.trigger.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggle();
		});

		// Click outside to close
		document.addEventListener('click', (e) => {
			if (!this.dropdown.contains(e.target as Node) && this.isOpen) {
				this.close();
			}
		});

		// Keyboard handling
		this.trigger.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				this.toggle();
			} else if (e.key === 'ArrowDown' && !this.isOpen) {
				e.preventDefault();
				this.open();
			}
		});

		// Menu keyboard navigation
		this.content.addEventListener('keydown', (e) => {
			this.handleKeyboardNavigation(e);
		});

		// Close on Escape
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.isOpen) {
				this.close();
				this.trigger.focus();
			}
		});
	}

	private toggle() {
		this.isOpen ? this.close() : this.open();
	}

	private open() {
		// Close all other breadcrumb dropdowns
		document
			.querySelectorAll('.c-breadcrumbDropdown_content[data-state="open"]')
			.forEach((content) => {
				const otherDropdown = content.closest('.c-breadcrumbDropdown');
				if (otherDropdown !== this.dropdown) {
					content.setAttribute('data-state', 'closed');
					setTimeout(() => content.removeAttribute('data-state'), 150);
					const otherTrigger = otherDropdown?.querySelector(
						'[data-dropdown-trigger]'
					) as HTMLElement;
					if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
				}
			});

		this.isOpen = true;
		this.content.setAttribute('data-state', 'open');
		this.trigger.setAttribute('aria-expanded', 'true');

		// Focus first item
		setTimeout(() => {
			this.items[0]?.focus();
		}, 50);
	}

	private close() {
		this.isOpen = false;
		this.content.setAttribute('data-state', 'closed');
		this.trigger.setAttribute('aria-expanded', 'false');

		// Wait for animation
		setTimeout(() => {
			if (!this.isOpen) {
				this.content.removeAttribute('data-state');
			}
		}, 150);
	}

	private handleKeyboardNavigation(e: KeyboardEvent) {
		const currentIndex = this.items.indexOf(document.activeElement as HTMLElement);

		switch (e.key) {
			case 'ArrowDown': {
				e.preventDefault();
				const nextIndex = currentIndex < this.items.length - 1 ? currentIndex + 1 : 0;
				this.items[nextIndex]?.focus();
				break;
			}
			case 'ArrowUp': {
				e.preventDefault();
				const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.items.length - 1;
				this.items[prevIndex]?.focus();
				break;
			}
			case 'Home':
				e.preventDefault();
				this.items[0]?.focus();
				break;
			case 'End':
				e.preventDefault();
				this.items[this.items.length - 1]?.focus();
				break;
			case 'Tab':
				this.close();
				break;
		}
	}
}

// Initialize all breadcrumb dropdowns
init('Breadcrumb Dropdowns', () => {
	const dropdowns = document.querySelectorAll('.c-breadcrumbDropdown');
	dropdowns.forEach((dropdown) => {
		new BreadcrumbDropdown(dropdown as HTMLElement);
	});
});
