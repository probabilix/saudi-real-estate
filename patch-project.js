const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/app/[locale]/projects/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the index of the broken code block
const marker = 'rel="noopener noreferrer"';
const markerIndex = content.indexOf(marker);

if (markerIndex === -1) {
  console.error('Could not find broken block in page.tsx');
  process.exit(1);
}

// Find where to cut (we want to replace everything from the line preceding the marker up to the end)
// The line preceding the marker is where the broken <a> tag started, which was after the REGA compliance block closure `}`.
const startSearch = '            {project.regaFalLicense && (\n              <div className="bg-charcoal text-white rounded-2xl p-6 border';
const anchorStartPos = content.indexOf('            {project.regaFalLicense && (');

if (anchorStartPos === -1) {
  console.error('Could not find REGA block start to align replacement');
  process.exit(1);
}

// Let's find the closing `}` of REGA block
const regaBlockEndPos = content.indexOf('            )}', anchorStartPos);
if (regaBlockEndPos === -1) {
  console.error('Could not find REGA block end');
  process.exit(1);
}

const cutPos = regaBlockEndPos + '            )}'.length;

const keepPart = content.substring(0, cutPos);

const replacement = `

            {project.brochureUrl && (
              <div className="relative overflow-hidden rounded-2xl p-6 border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-surface-50 to-primary-500/10 shadow-md space-y-4">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                  <BookOpen className="w-32 h-32 text-primary-500" />
                </div>
                <div className="space-y-1 relative z-10">
                  <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest block">
                    {tListing('brochurePremiumMaterial')}
                  </span>
                  <h4 className="text-lg font-serif font-bold text-charcoal">
                    {tListing('brochureTitle')}
                  </h4>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {tListing('brochureDesc')}
                  </p>
                </div>
                <button
                  onClick={() => setBrochureModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white transition-all shadow-lg shadow-primary-600/15 group active:scale-[0.98] relative z-10"
                >
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {tListing('brochureCta')}
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {project.brochureUrl && (
        <BrochureModal
          isOpen={brochureModalOpen}
          onClose={() => setBrochureModalOpen(false)}
          brochureUrl={project.brochureUrl}
        />
      )}

    </div>
  );
}
`;

fs.writeFileSync(filePath, keepPart + replacement, 'utf8');
console.log('Successfully patched page.tsx!');
