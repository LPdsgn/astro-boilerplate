import type { CookieConsentConfig } from 'vanilla-cookieconsent'

export const config: CookieConsentConfig = {
   root: '#cc-container', // Important, generate the html inside a common/persistent element

   guiOptions: {
      consentModal: {
         layout: 'box inline',
         position: 'bottom center',
      },
      preferencesModal: {
         layout: 'box',
         position: 'right',
         equalWeightButtons: true,
         flipButtons: false,
      },
   },
   categories: {
      necessary: {
         readOnly: true,
      },
      functionality: {
         readOnly: true,
         services: {
            /* tagManager: {
               label: 'Google Tag Manager',
            }, */
            vercelAnalytics: {
               label: 'Vercel Analytics',
            },
            vercelInsights: {
               label: 'Vercel Speed Insights',
            },
         },
      },
      analytics: {
         /* services: {
            ga4: {
               label: 'Google Analytics',
               onAccept: () => {
                  console.log('ga4 accepted')
                  // TODO: load ga4
               },
               onReject: () => {
                  console.log('ga4 rejected')
               },
               cookies: [
                  {
                     name: /^_ga/,
                  },
               ],
            },
            matomo: {
               label: 'Matomo Analytics',
               onAccept: () => {
                  console.log('matomo accepted')
                  // TODO: load ga4
               },
               onReject: () => {
                  console.log('matomo rejected')
               },
               cookies: [
                  {
                     name: /^_ga/,
                  },
               ],
            },
         }, */
      },
   },
   language: {
      default: 'en',
      autoDetect: 'browser',
      translations: {
         en: {
            consentModal: {
               title: "It's cookie time!",
               description:
                  'I am legally obliged to inform you that there are cookies and some tracking tools on this site.',
               acceptAllBtn: 'Okay',
               /* acceptNecessaryBtn: 'Reject all', */
               showPreferencesBtn: 'So what?',
               /* footer:
                  '<a href="#link">Privacy Policy</a>\n<a href="#link">Terms and conditions</a>', */
            },
            preferencesModal: {
               title: 'Cookie time! &#x1F36A;',
               acceptAllBtn: "I don't care",
               /* acceptNecessaryBtn: 'Reject all', */
               savePreferencesBtn: 'Fine like that',
               closeIconLabel: 'Close modal',
               serviceCounterLabel: 'Service|Services',
               sections: [
                  {
                     /* title: 'Cookie Usage', */
                     description:
                        "How I was saying, I am legally obliged to inform you that there are some tracking tools on this site. Calm down, <b><u>you are anonymized</u></b> by default! &#x1F977;&#x1F3FC;<br/><br/>Occasionally, I may give a look at how people use my website, to evaluate areas for improvement (or for simple personal curiosity). This also is my personal playground, a.k.a. the place where I test stuff and their features (including analytics tools).<br/><br/>However, if you don't like the idea of me knowing what you click on, you can still disable something here below.",
                  },
                  /* {
                     title: 'Necessary Cookies',
                     description:
                        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
                     linkedCategory: 'necessary',
                  }, */
                  {
                     title: 'Boring stuff <span class="pm__badge">Always Enabled</span>',
                     /* description:
                        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', */
                     linkedCategory: 'functionality',
                  },
                  {
                     title: 'Analytics boring stuff',
                     linkedCategory: 'analytics',
                  },
                  /* {
                     title: 'More information',
                     description:
                        'For any query in relation to my policy on cookies and your choices, please <a class="cc__link" href="#yourdomain.com">contact me</a>.',
                  }, */
               ],
            },
         },
      },
   },
}
