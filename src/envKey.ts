/** Versiunea de test (link dedicat) folosește aceleași domeniu și browser ca cea reală: cheile din localStorage se separă printr-un sufix. */
export const IS_TEST = import.meta.env.VITE_ENV === 'test';
export const NS = IS_TEST ? '-test' : '';
