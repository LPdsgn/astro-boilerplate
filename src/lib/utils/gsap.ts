export * from 'gsap';
import { gsap } from 'gsap';

export * from 'gsap/CustomEase';
import { CustomEase } from 'gsap/CustomEase';
export * from 'gsap/EasePack';
import { RoughEase, ExpoScaleEase, SlowMo } from 'gsap/EasePack';

export * from 'gsap/Flip';
import { Flip } from 'gsap/Flip';
export * from 'gsap/ScrollTrigger';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
export * from 'gsap/Observer';
import { Observer } from 'gsap/Observer';
export * from 'gsap/ScrollToPlugin';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
export * from 'gsap/Draggable';
import { Draggable } from 'gsap/Draggable';
export * from 'gsap/MotionPathPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
export * from 'gsap/EaselPlugin';
import { EaselPlugin } from 'gsap/EaselPlugin';
export * from 'gsap/PixiPlugin';
import { PixiPlugin } from 'gsap/PixiPlugin';
export * from 'gsap/TextPlugin';
import { TextPlugin } from 'gsap/TextPlugin';

gsap.registerPlugin(
	Flip,
	ScrollTrigger,
	Observer,
	ScrollToPlugin,
	Draggable,
	MotionPathPlugin,
	EaselPlugin,
	PixiPlugin,
	TextPlugin,
	RoughEase,
	ExpoScaleEase,
	SlowMo,
	CustomEase
);
