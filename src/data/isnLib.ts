// @ts-nocheck
// Algoritmul oficial ISNCSCI (Praxis Spinal Cord Institute), preluat nemodificat din Vademecum MFR 3.0; licența Apache 2.0 este în comentariul de mai jos.
/* ISNCSCI Algorithm 2.0.6 (pachetul npm isncsci), Praxis Spinal Cord Institute, github.com/praxis-isncsci/algorithm.
   Codul algoritmului este inclus nemodificat; s-a schimbat doar obiectul în care se exportă (ISN_LIB). Licența originală:
Copyright © 2020 Praxis Spinal Cord Institute


Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so, subject
to the terms of the Apache License, Version 2.0 (the "License"); you may not use
this software except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable
law or agreed to in writing, software distributed under the License is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing permissions and
limitations under the License.

This software, developed by the Praxis Spinal Cord Institute (Praxis) in collaboration with the
International Spinal Cord Society (ISCoS) as well as industry experts
(http://www.isncscialgorithm.com/Home/Team/), provides a tool which utilizes the raw
test scores determined by performing the exam to electronically score and classify a
spinal cord injury using the American Spinal Injury Association's (ASIA) International
Standards for Neurological Classification of Spinal Cord Injury Revised 2011 scoring
rules. This is being provided without liability on the part of RHI and no
representation or warranty with respect to the content is being made by ASIA or ISCoS.

Any modifications to the software may invalidate the algorithm.

If you would like  to modify it in any  way, we ask that you include the below citation
on any modification and that you share a copy of your modification with us at
isncscialgorithm@praxisinstitute.org . Thank you for your cooperation.

Citation to be included in any use (or modification):
     “(Modified by [X] from)  ISNCSCI Algorithm. (V. 1.0.3, 2015). http://www.isncscialgorithm.com  Praxis Spinal Cord Institute, Vancouver, British Columbia.” 

Recommended citation for publications:
     ISNCSCI Algorithm. (V. 1.0.3, 2015). http://www.isncscialgorithm.com  Praxis Spinal Cord Institute, Vancouver, British Columbia. (accessed YYYY-MM-DD)





Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "{}"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright {yyyy} {name of copyright owner}

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
export const ISN_LIB = (function () { var __isn = {}; !function(e){"use strict";var t=["C5","C6","C7","C8","T1","L2","L3","L4","L5","S1"],n=["C1","C2","C3","C4","C5","C6","C7","C8","T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","L1","L2","L3","L4","L5","S1","S2","S3","S4_5"],r=function(e){return["0","1","0*","1*"].includes(e)},o=function(e){return["0**","1**"].includes(e)},i=function(e){return["2","NT","NT**"].includes(e)},l=function(e,t,n,l){if("C1"===n)throw"invalid arguments level: "+t+" nextLevel: "+n;if("2"===e.lightTouch[n]&&"2"===e.pinPrick[n])return{continue:!0,variable:l};if(r(e.lightTouch[n])||r(e.pinPrick[n]))return{continue:!1,level:t+(l?"*":""),variable:l};if([e.lightTouch[n],e.pinPrick[n]].includes("NT*"))return{continue:!1,level:t+"*",variable:!0};if("NT"===e.lightTouch[n]||"NT"===e.pinPrick[n]){if(o(e.lightTouch[n])||o(e.pinPrick[n]))return{continue:!0,level:t+(l?"*":""),variable:!0};if(i(e.lightTouch[n])||i(e.pinPrick[n]))return{continue:!0,level:t+(l?"*":""),variable:l};throw""}return{continue:!0,variable:!0}},u=function(e){for(var t=[],r=!1,o=0;o<n.length;o++){var i=n[o],u=n[o+1];if(u){var c=l(e,i,u,r);if(r=r||!!c.variable,c.level&&t.push(c.level),c.continue)continue;break}t.push("INT"+(r?"*":""))}return t.join(",")},c=function(e){return["0","NT","0*","NT*"].includes(e)},a=function(e,t,r){return e>=n.indexOf(t)&&e<=n.indexOf(r)},s=function(e,t,n,r){if(["0","1","2"].includes(e.motor[t]))throw new Error("Invalid motor value at current level");var o={continue:!1,variable:r};return["0","1","2"].includes(e.motor[t])||["0*","1*","2*","NT*","3","4","3*","4*"].includes(e.motor[t])||["0","1","2"].includes(e.motor[n])||(o.continue=!0),["5","0**","1**","2**","3**","4**","NT**"].includes(e.motor[t])&&!["0","1","2","0*","1*","2*","NT","NT*"].includes(e.motor[n])||(["0*","1*","2*","NT*"].includes(e.motor[t])||["0**","1**","2**"].includes(e.motor[t])&&["0*","1*","2*","NT","NT*"].includes(e.motor[n])?o.level=t+"*":o.level=t+(r?"*":"")),["5","3","4","3*","4*","NT"].includes(e.motor[t])?"5"===e.motor[t]&&["0**","1**","2**"].includes(e.motor[n])&&(o.variable=!0):["0**","1**","2**","3**","4**","NT**"].includes(e.motor[t])&&["0","1","2"].includes(e.motor[n])||(o.variable=!0),o},v=function(e,t,n,r){return{continue:!["0","1","2"].includes(e.motor[n]),level:["0","1","2","0*","1*","2*","NT","NT*"].includes(e.motor[n])?t+(r?"*":""):void 0,variable:r||["0**","1**","2**"].includes(e.motor[n])}},p=function(e,t,r){if(["0","1","2"].includes(e.motor[t]))throw new Error("Invalid motor value at current level");var o=function(e,t){for(var r=n.indexOf(t)-1,o={continue:!0,variable:!1},i=r;i<=r+5;i++){var u=n[i],c=n[i+1],a=l(e,u,c,!1);!1===a.continue&&(o.continue=!1),a.level&&(o.level=a.level),a.variable&&(o.variable=!0)}return o}(e,"T1"===t?"C5":"L2");return function(e,t,n,r){var o={continue:!0,variable:n};return!["3","4","0*","1*","2*","3*","4*","NT*"].includes(e.motor[t])&&r.continue||(o.continue=!1),"NT"!==e.motor[t]&&["5","0**","1**","2**","3**","4**","NT**"].includes(e.motor[t])&&r.continue&&!r.level||(["0*","1*","2*","NT*"].includes(e.motor[t])||["0**","1**","2**"].includes(e.motor[t])&&(r.level||!r.continue)?o.level=t+"*":o.level=t+(n?"*":"")),(["0*","1*","2*","NT*","0**","1**","2**"].includes(e.motor[t])||["3**","4**","NT**"].includes(e.motor[t])&&r.continue||["5","NT"].includes(e.motor[t])&&r.continue&&r.variable&&!r.level)&&(o.variable=!0),o}(e,t,r,o)},f=function(e,r){for(var o,i,u,c=[],f=!1,d=0;d<n.length;d++){if(o=n[d],i=n[d+1],a(d,"C1","C3")||a(d,"T2","T12")||a(d,"S2","S3"))u=l(e,o,i,f);else if("C4"===o||"L1"===o)u=v(e,o,i="C4"===o?"C5":"L2",f);else if(a(d,"C5","C8")||a(d,"L2","L5")){var h=d-(a(d,"C5","C8")?4:16);o=t[h],i=t[h+1],u=s(e,o,i,f)}else if("T1"===o||"S1"===o)u=p(e,o,f);else if("No"===r){if(c.includes("S3")||c.includes("S3*"))break;u={continue:!1,level:"S3"+(f?"*":""),variable:f}}else"NT"===r?(c.includes("S3")||c.includes("S3*")||c.push("S3"+(f?"*":"")),u={continue:!1,level:"INT"+(f?"*":""),variable:f}):u={continue:!1,level:"INT"+(f?"*":""),variable:f};if(f=f||u.variable,u.level&&c.push(u.level),!u.continue)return c.join(",")}return c.join(",")},d=function(){return d=Object.assign||function(e){for(var t,n=1,r=arguments.length;n<r;n++)for(var o in t=arguments[n])Object.prototype.hasOwnProperty.call(t,o)&&(e[o]=t[o]);return e},d.apply(this,arguments)};function h(e,t){for(var n=0,r=t.length,o=e.length;n<r;n++,o++)e[o]=t[n];return e}var m=function(e){return"0"===e},N=function(e,t,n){if("C1"===t)throw"invalid argument level: "+t;var r=m(e.pinPrick[t]),o=m(e.lightTouch[t]);if(r&&o)return{continue:!0,variable:n};if(c(e.pinPrick[t])&&c(e.lightTouch[t])){var i=[e.pinPrick[t],e.lightTouch[t]].some((function(e){return["NT","NT*"].includes(e)}));return i?{continue:!0,level:t+(n?"*":""),variable:n}:{continue:!0,level:t+"*",variable:n||!i}}return{continue:!1,level:t+(n?"*":""),variable:n}},y=function(e,t){var r=[],o=!1;if(("No"===t||"NT"===t)&&c(e.lightTouch.S4_5)&&c(e.pinPrick.S4_5)){var i=N(e,"S4_5",o);"NT"!==t&&("No"!==t||i.continue&&void 0===i.level)||r.push("NA");for(var l=[],u=n.indexOf("S3");u>=0;u--){var a=n[u];if(u>0){var s=N(e,a,o);if(o=o||s.variable,s.level&&l.unshift(s.level),s.continue)continue;break}l.unshift(a)}return(r=h(h([],r),l)).join(",")}return"NA"};function P(e,t,n){return!!n&&(null!==e.motor?/0\*/.test(e.motor):!(!/\d\*/.test(e.lightTouch)&&!/\d\*/.test(e.pinPrick))||(/\d\*/.test(e.lightTouch)||/\d\*/.test(e.pinPrick)||e.index<=t.index&&e.index>=n.index))}function T(e){var t=e.zpp.sort((function(e,t){return("NA"===e?-1:n.indexOf(e.replace(/\*/,"")))-("NA"===t?-1:n.indexOf(t.replace(/\*/,"")))}));return{description:{key:"motorZPPSortMotorZPPDescription"},actions:[{key:"motorZPPSortMotorZPPEnsureNAIsPlacedFirstAction"}],state:d(d({},e),{zpp:t}),next:null}}function C(e){var t={key:"motorZPPAddLowerNonKeyMuscleToMotorZPPIfNeededDescription"};return e.addNonKeyMuscle&&!e.nonKeyMuscleHasBeenAdded&&e.nonKeyMuscle?{description:t,actions:[{key:"motorZPPAddLowerNonKeyMuscleToMotorZPPIfNeededAddNonKeyMuscleAction"}],state:d(d({},e),{zpp:h(h([],e.zpp),[e.nonKeyMuscle.name])}),next:T}:{description:t,actions:[{key:"motorZPPAddLowerNonKeyMuscleToMotorZPPIfNeededIgnoreNonKeyMuscleAction"}],state:d(d({},e),{zpp:h([],e.zpp)}),next:T}}function g(e){var t;return(null===(t=e.currentLevel)||void 0===t?void 0:t.motor)?function(e){if(!e.currentLevel)throw new Error("checkForMotorFunction :: state.currentLevel is null. A SideLevel value is required.");var t=e.currentLevel;if(!t.motor)throw new Error("checkForMotorFunction :: state.currentLevel.motor is null.");var n=!!e.nonKeyMuscle&&t.name===e.nonKeyMuscle.name,r=e.testNonKeyMuscle&&e.nonKeyMuscle&&e.nonKeyMuscle.index-t.index>3,o={key:"motorZPPCheckForMotorFunctionDescription",params:{levelName:t.name,motor:t.motor}},i=t.name===e.topLevel.name;if(/^[1-5]/.test(t.motor)||/^(NT|[0-4])\*\*$/.test(t.motor)){var l=P(t,e.lastLevelWithConsecutiveNormalValues,e.firstLevelWithStar);return r?{description:o,actions:[{key:"motorZPPCheckForMotorFunctionNonKeyMuscleOverrideAndStopAction"}],state:d(d({},e),{zpp:h([],e.zpp),currentLevel:t.previous,addNonKeyMuscle:!0}),next:C}:{description:o,actions:[{key:"motorZPPCheckForMotorFunctionAddLevelAndStopAction"}],state:d(d({},e),{zpp:h([t.name+(l?"*":"")],e.zpp),currentLevel:t.previous,nonKeyMuscleHasBeenAdded:e.nonKeyMuscleHasBeenAdded||n}),next:C}}if(/^(NT\*?$)|(0\*$)/.test(t.motor)){var u=[{key:i?"motorZPPCheckForMotorFunctionStopAtTopAction":"motorZPPCheckForMotorFunctionContinueUntilTopAction"}];return(l=P(t,e.lastLevelWithConsecutiveNormalValues,e.firstLevelWithStar))&&u.push({key:"motorZPPCheckForMotorFunctionAddStarAction"}),r?{description:o,actions:h([{key:"motorZPPCheckForMotorFunctionFunctionFoundButKeyMuscleOverrideAction"}],u),state:d(d({},e),{zpp:h([],e.zpp),currentLevel:t.previous,addNonKeyMuscle:!0}),next:i?C:g}:{description:o,actions:h([{key:"motorZPPCheckForMotorFunctionAddLevelWithNormalFunctionAndContinue"}],u),state:d(d({},e),{zpp:h([t.name+(l?"*":"")],e.zpp),currentLevel:t.previous,nonKeyMuscleHasBeenAdded:e.nonKeyMuscleHasBeenAdded||n}),next:i?C:g}}return t.name===e.topLevel.name?{description:o,actions:[{key:"motorZPPCheckForMotorFunctionTopOfRangeReachedStopAction"}],state:d(d({},e),{currentLevel:t.previous}),next:C}:{description:o,actions:[{key:"motorZPPCheckForMotorFunctionNoFunctionFoundContinueAction"}],state:d(d({},e),{currentLevel:t.previous}),next:g}}(e):function(e){if(!e.currentLevel)throw new Error("checkForSensoryFunction :: state.currentLevel is null. A SideLevel value is required.");var t=e.currentLevel,n={key:"motorZPPCheckForSensoryFunctionDescription",params:{levelName:t.name,lightTouch:t.lightTouch,pinPrick:t.pinPrick}},r=t.name===e.topLevel.name;if(e.motorLevel.includes(t.name)){var o=P(t,e.lastLevelWithConsecutiveNormalValues,e.firstLevelWithStar),i=t.name+(o?"*":""),l=e.testNonKeyMuscle&&null!==e.nonKeyMuscle&&e.nonKeyMuscle.index-t.index>3,u=[{key:"motorZPPCheckForSensoryFunctionLevelIncludedInMotorValuesAction",params:{levelName:t.name}},{key:l?"motorZPPCheckForSensoryFunctionLevelIncludedButOverriddenByNonKeyMuscleAction":"motorZPPCheckForSensoryFunctionAddLevelAndContinueAction"}];return r&&u.push({key:"motorZPPCheckForSensoryFunctionTopOfRangeReachedStopAction"}),{description:n,actions:u,state:d(d({},e),{zpp:h(l?[]:[i],e.zpp),currentLevel:t.previous,addNonKeyMuscle:e.addNonKeyMuscle||l}),next:r?C:g}}return r?{description:n,actions:[{key:"motorZPPCheckForSensoryFunctionTopOfRangeReachedStopAction"}],state:d(d({},e),{zpp:h([],e.zpp)}),next:C}:{description:n,actions:[{key:"motorZPPCheckForSensoryFunctionNoSensoryFunctionFoundContinueAction"}],state:d(d({},e),{zpp:h([],e.zpp),currentLevel:t.previous}),next:g}}(e)}function L(e){var r=e.motorLevel.replace(/\*/g,"").split(","),o=r[0],i=r[r.length-1],l=/(S2|S3|INT)\*?(,|$)/.test(e.motorLevel),u=l?"INT"===i?"S3":i:"S1",c={key:l?"motorZPPGetTopAndBottomLevelsForCheckIncludeBelowS1Action":"motorZPPGetTopAndBottomLevelsForCheckDoNotIncludeBelowS1Action"},a=function(e,r,o,i){for(var l,u,c=null,a=null,s=null,v=null,p=null,f=null,d=0;d<n.length&&!s;d++){var h=n[d],m=t.includes(h)?h:null,N={name:h,lightTouch:"C1"===h?"2":e.lightTouch[h],pinPrick:"C1"===h?"2":e.pinPrick[h],motor:m?e.motor[m]:null,index:d,next:null,previous:null};!p&&(/\*/.test(N.lightTouch)||/\*/.test(N.pinPrick)||/\*/.test(null!==(l=N.motor)&&void 0!==l?l:""))&&(p=N),f||/(^2$)|(\*\*$)/.test(N.lightTouch)&&/(^2$)|(\*\*$)/.test(N.pinPrick)&&/(^5$)|(\*\*$)/.test(null!==(u=N.motor)&&void 0!==u?u:"")||(f=c),m&&m===i&&(v=N),r===h?(c=N,a=N):c&&(c.next=N,N.previous=c,c=N),o===h&&(s=c,f||(f=c))}if(!a||!s||!f)throw new Error("getLevelsRange :: Unable to determine the topLevel, bottomLevel, or lastLevelWithConsecutiveNormalValues");return{topLevel:a,bottomLevel:s,nonKeyMuscle:v,firstLevelWithStar:p,lastLevelWithConsecutiveNormalValues:f}}(e.side,o,u,e.side.lowestNonKeyMuscleWithMotorFunction?e.side.lowestNonKeyMuscleWithMotorFunction:null),s=a.topLevel,v=a.bottomLevel,p=a.nonKeyMuscle,f=a.firstLevelWithStar,m=a.lastLevelWithConsecutiveNormalValues;return{description:{key:"motorZPPGetTopAndBottomLevelsForCheckDescription"},actions:[{key:"motorZPPGetTopAndBottomLevelsForCheckRangeAction",params:{bottom:v.name,top:s.name}},c],state:d(d({},e),{topLevel:s,bottomLevel:v,currentLevel:v,nonKeyMuscle:p,firstLevelWithStar:f,lastLevelWithConsecutiveNormalValues:m,zpp:h([],e.zpp)}),next:g}}function k(e){var t=null!==e.side.lowestNonKeyMuscleWithMotorFunction&&/C/i.test(e.ais);return{description:{key:"motorZPPCheckLowerNonKeyMuscleDescription"},actions:[{key:t?"motorZPPCheckLowerNonKeyMuscleConsiderAction":"motorZPPCheckLowerNonKeyMuscleDoNotConsiderAction"}],state:d(d({},e),{zpp:h([],e.zpp),testNonKeyMuscle:t}),next:L}}function b(e){var t={key:"motorZPPCheckIfMotorZPPIsApplicableDescription"},n=k;return"Yes"===e.voluntaryAnalContraction?{description:t,actions:[{key:"motorZPPCheckIfMotorZPPIsApplicableYesAction"}],state:d(d({},e),{zpp:["NA"]}),next:null}:"NT"===e.voluntaryAnalContraction?{description:t,actions:[{key:"motorZPPCheckIfMotorZPPIsApplicableNTAction"}],state:d(d({},e),{zpp:["NA"]}),next:n}:{description:t,actions:[{key:"motorZPPCheckIfMotorZPPIsApplicableNoAction"}],state:d(d({},e),{zpp:h([],e.zpp)}),next:n}}function A(e,t,n,r){var o={name:"C1",lightTouch:"2",pinPrick:"2",motor:null,index:0,next:null,previous:null};return{ais:n,motorLevel:r.replace(/\*/g,""),voluntaryAnalContraction:t,zpp:[],topLevel:o,bottomLevel:o,currentLevel:null,side:e,nonKeyMuscle:null,nonKeyMuscleHasBeenAdded:!1,testNonKeyMuscle:!1,addNonKeyMuscle:!1,firstLevelWithStar:null,lastLevelWithConsecutiveNormalValues:o}}function S(e,t,n,r){for(var o={description:{key:"motorZPPCheckIfMotorZPPIsApplicableDescription"},actions:[],state:A(e,t,n,r),next:b};o.next;)o=o.next(o.state);return o.state.zpp.join(",")}var M=function(e,t,n,r){var o;return(t.level||n.level)&&(o=t.level&&n.level&&t.level.includes("*")&&n.level.includes("*")?e+"*":e+(r?"*":"")),{continue:t.continue&&n.continue,level:o,variable:r||t.variable||n.variable}},F=function(e,r,o,i){var l,u=n.indexOf(r),c=u-(a(u,"C4","T1")?4:16),p=t[c],f=t[c+1],h="C4"===r||"L1"===r?v(e.left,r,f,i):s(e.left,p,"T1"===r||"S1"===r?p:f,i),m="C4"===r||"L1"===r?v(e.right,r,f,i):s(e.right,p,"T1"===r||"S1"===r?p:f,i);return(h.level||m.level||o.level)&&(l=h.level&&m.level&&(h.level.includes("*")||m.level.includes("*"))?r+"*":r+(i?"*":"")),o.continue?{continue:h.continue&&m.continue,level:l,variable:i||o.variable||h.variable||m.variable}:d(d({},o),{level:l})},x=function(e){for(var t=[],r=!1,o=0;o<n.length;o++){var i=n[o],u=n[o+1],c={continue:!0,variable:!1};if(u){var s=l(e.left,i,u,r),v=l(e.right,i,u,r);if(a(o,"C4","T1")||a(o,"L1","S1")){var p=M(i,s,v,r);c=F(e,i,p,r)}else c=M(i,s,v,r);if(r=r||c.variable,c.level&&t.push(c.level),!c.continue)break}else t.push("INT"+(r?"*":""))}return t.join(",")},I=function(e){return a(e,"C2","C4")?0:a(e,"C5","T1")?e-4:a(e,"T2","L1")?5:a(e,"L2","S1")?e-16:t.length},K=function(e){var t=[e.right.lightTouch.S4_5,e.right.pinPrick.S4_5,e.left.lightTouch.S4_5,e.left.pinPrick.S4_5];return{result:"No"!==e.deepAnalPressure||"0"!==e.right.lightTouch.S4_5||"0"!==e.right.pinPrick.S4_5||"0"!==e.left.lightTouch.S4_5||"0"!==e.left.pinPrick.S4_5,variable:"No"===e.deepAnalPressure&&!t.every((function(e){return"0"===e}))&&t.every((function(e){return["0","0*","0**"].includes(e)}))}},w=function(e,r,o){for(var i,l=!1,u=0,c=r.split(",");u<c.length;u++){for(var a=c[u],s="INT"===a||"INT*"===a?n.indexOf("S4_5"):n.indexOf(a.replace("*",""))+4,v=!0,p=I(s);p<t.length;p++){var f=t[p];if("0*"!==e[f]&&"0**"!==e[f]||(l=!0),i=e[f],!["0","NT","NT*","0*"].includes(i)||f===o){v=!1,"0*"===e[f]&&(l=!0);break}}if(v)return{result:!0,variable:l}}return{result:!1,variable:!1}},Z=function(e,t){var n=K(e),r=function(e,t){var n=w(e.left.motor,t.motorLeft,e.left.lowestNonKeyMuscleWithMotorFunction),r=w(e.right.motor,t.motorRight,e.right.lowestNonKeyMuscleWithMotorFunction);return{result:"Yes"!==e.voluntaryAnalContraction&&r.result&&n.result,variable:"No"===e.voluntaryAnalContraction&&(n.variable||r.variable)}}(e,t);return{result:n.result&&r.result,variable:n.variable||r.variable}},z=function(e){return["0","1","2","NT","NT*"].includes(e)},O=function(e){return["0*","1*","2*"].includes(e)},W=function(e,r){for(var o=0,i=r.replace(/\*/g,"").split(",");o<i.length;o++){for(var l=i[o],u="INT"===l||"INT*"===l?n.indexOf("S4_5"):n.indexOf(l),c=I(u+1),a=t.length-c,s=0,v=0,p=c;p<t.length;p++){var f=t[p];if(z(e.left.motor[f])?s++:O(e.left.motor[f])&&(s++,v++),z(e.right.motor[f])?s++:O(e.right.motor[f])&&(s++,v++),s-v>a)return{result:!0,variable:!1}}if(s>a&&s-v<=a)return{result:!0,variable:!0}}return{result:!1,variable:!1}},_=function(e,t,n){var r=function(e){return JSON.parse(JSON.stringify(e).replace(/\*/g,""))}(e),o=x(r),i=W(r,o),l=W(e,t);if(l.result)return l.variable||n.variable||!i.result?"C*":"C"},E=function(e){return!["0","1","2"].includes(e)},B=function(e){return["0*","1*","2*","0**","1**","2**"].includes(e)},R=function(e,r,o){var i=function(e,r){for(var o={result:!1,variable:!1},i=0,l=r.replace(/\*/g,"").split(",");i<l.length;i++){var u=l[i];if("INT"===u)break;var c=n.indexOf(u),a=I(c+1),s=t.length-a;if(0===s)return{result:!0,variable:!1};for(var v=0,p=0,f=a;f<t.length;f++){var d=t[f];if(v+=E(e.left.motor[d])?1:0,v+=E(e.right.motor[d])?1:0,p+=B(e.left.motor[d])?1:0,v-(p+=B(e.right.motor[d])?1:0)>=s)return{result:!0,variable:!1}}v>=s&&(o.result=!0,o.variable=o.variable||v-p<s)}return o}(e,r);if(i.result)return i.variable||o.variable?"D*":"D"},j=function(e,r,o){for(var i=!1,l=0,u=r.split(",");l<u.length;l++)for(var c=u[l],a="INT"===c||"INT*"===c?n.indexOf("S4_5"):n.indexOf(c.replace("*",""))+4,s=I(a);s<t.length;s++){var v=t[s];if("0**"===e[v]&&(i=!0),"0"!==e[v]||v===o)return{result:!0,variable:i}}return{result:i,variable:i}},D=function(e,t,n,r){if("INT"===r&&"Yes"===e.voluntaryAnalContraction)return"E";if("INT*"===r&&"Yes"===e.voluntaryAnalContraction)return"E*";var o=[],i=function(e){if(function(e){return e.includes("C")}(e))return e.includes("*")?"A*":"A"}(t);i&&o.push(i);var l=function(e,t){var n=Z(e,t);if(n.result)return n.variable?"B*":"B"}(e,n);l&&o.push(l);var u=function(e,t){var n={result:!1,variable:!1};if(function(e){return"No"!==e.voluntaryAnalContraction}(e))return n.result=!0,n;if(K(e).result){var r=j(e.right.motor,t.motorRight,e.right.lowestNonKeyMuscleWithMotorFunction),o=j(e.left.motor,t.motorLeft,e.left.lowestNonKeyMuscleWithMotorFunction);(r.result||o.result)&&(n.result=!0,(r.variable||o.variable)&&(n.variable=!0))}return n}(e,n);if(u.result){var c=_(e,r,u);c&&o.push(c);var a=R(e,r,u);a&&o.push(a)}var s=function(e,t){if("No"!==t)return e.includes("INT*")?"E*":e.includes("INT")?"E":void 0}(r,e.voluntaryAnalContraction);return s&&o.push(s),o.join(",")},$=function(e){var t=function(e){return{sensoryRight:u(e.right),sensoryLeft:u(e.left),motorRight:f(e.right,e.voluntaryAnalContraction),motorLeft:f(e.left,e.voluntaryAnalContraction)}}(e),n=x(e),r=function(e){var t=[e.right.lightTouch.S4_5,e.right.pinPrick.S4_5,e.left.lightTouch.S4_5,e.left.pinPrick.S4_5];if("No"===e.voluntaryAnalContraction&&"No"===e.deepAnalPressure){if(t.every((function(e){return"0"===e})))return"C";if(t.every((function(e){return["0","0*"].includes(e)})))return"C*,I*";if(t.every((function(e){return["0","0**"].includes(e)})))return"I*"}return"Yes"!==e.voluntaryAnalContraction&&"Yes"!==e.deepAnalPressure&&t.every(c)?"C,I":"I"}(e),o=D(e,r,t,n),i=function(e,t,n){return{sensoryRight:y(e.right,e.deepAnalPressure),sensoryLeft:y(e.left,e.deepAnalPressure),motorRight:S(e.right,e.voluntaryAnalContraction,t,n.motorRight),motorLeft:S(e.left,e.voluntaryAnalContraction,t,n.motorLeft)}}(e,o,t);return{neurologicalLevels:t,neurologicalLevelOfInjury:n,injuryComplete:r,ASIAImpairmentScale:o,zoneOfPartialPreservations:i}},V="ND",Y=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];if(e.includes(NaN))throw e[e.indexOf(NaN)]+" is not a valid value";return e.reduce((function(e,t){return e+t}),0).toString()},H=function(e,t){var n;if("all"===t?n=Object.values(e):"upper"===t?n=[e.C5,e.C6,e.C7,e.C8,e.T1]:"lower"===t&&(n=[e.L2,e.L3,e.L4,e.L5,e.S1]),!n)throw"option should be one of 'all' | 'upper' | 'lower'";return n.some((function(e){return["NT","NT*","NT**"].includes(e)}))?V:Y.apply(void 0,n.map((function(e){return parseInt(e.replace(/\*/g,""))})))},G=function(e){var t=Object.values(e);return t.some((function(e){return["NT","NT*","NT**"].includes(e)}))?V:Y.apply(void 0,t.map((function(e){return parseInt(e.replace(/\*/g,""))})))},q=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return e.includes(V)?V:Y.apply(void 0,e.map((function(e){return parseInt(e.replace(/\*/g,""))})))+(e.some((function(e){return e.includes("*")}))?"*":"")},J=function(e){var t=H(e.motor,"all");return{upperExtremity:H(e.motor,"upper"),lowerExtremity:H(e.motor,"lower"),lightTouch:G(e.lightTouch),pinPrick:G(e.pinPrick),motor:t}},U=function(e){this.classification=$(e),this.totals=function(e){var t=J(e.left),n=J(e.right);return{left:t,right:n,upperExtremity:q(n.upperExtremity,t.upperExtremity),lowerExtremity:q(n.lowerExtremity,t.lowerExtremity),lightTouch:q(n.lightTouch,t.lightTouch),pinPrick:q(n.pinPrick,t.pinPrick)}}(e)};e.ISNCSCI=U,e.default=U,Object.defineProperty(e,"__esModule",{value:!0})}(__isn); return __isn; })();