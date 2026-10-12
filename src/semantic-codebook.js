// Frozen g2/1 codebook. These are shared semantic concepts and AMR roles,
// never full sentences. Append/change only with a new profile identifier.
export const NOUNS={child:'CHILD',bird:'BIRD',person:'PERSON',book:'BOOK',scientist:'SCIENTIST',city:'CITY',machine:'MACHINE',problem:'PROBLEM',water:'WATER'};
export const FRAMES={
  'see-01':['SEE','ARG0','ARG1'], 'love-01':['LOVE','ARG0','ARG1'],
  'read-01':['READ','ARG0','ARG1'], 'build-01':['BUILD','ARG0','ARG1'],
  'give-01':['GIVE','ARG0','ARG1','ARG2'], 'help-01':['HELP','ARG0','ARG1'],
  'drink-01':['DRINK','ARG0','ARG1'], 'run-01':['RUN','ARG0'],
  'die-01':['DIE','ARG1'], 'fail-01':['FAIL','ARG1'],
  'know-01':['KNOW','ARG0','ARG1'], 'believe-01':['BELIEVE','ARG0','ARG1'],
  'want-01':['WANT','ARG0','ARG1'], 'say-01':['SAY','ARG0','ARG1'],
  'remember-01':['REMEMBER','ARG0','ARG1'], 'red-02':['RED','ARG1'],
  'possible-01':['POSSIBLE','ARG1'], 'necessary-01':['NECESSARY','ARG1']
};
export const CONCEPTS=Object.freeze(['i','you',...Object.keys(NOUNS),...Object.keys(FRAMES),
  'and','or','every','each','all','name','amr-unknown','date-entity','organization','country',
  'have-org-role-91','have-rel-role-91','have-condition-91','have-polarity-91']);
export const RELATIONS=Object.freeze(['ARG0','ARG1','ARG2','ARG3','ARG4','ARG5','ARG0-of','ARG1-of','ARG2-of','ARG3-of',
  'mod','polarity','mode','quant','name','location','time','cause','purpose','condition','concession','concession-of',
  'direction','source','destination','path','manner','degree','domain','poss','part','consist-of','accompanier','beneficiary',
  'instrument','topic','example','ord','unit','value','scale',...Array.from({length:16},(_,i)=>'op'+(i+1))]);
