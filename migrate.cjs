const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const featuresDir = path.join(srcDir, 'features');
const pagesDir = path.join(srcDir, 'pages');

function moveAndFixImports(sourceDir, domain) {
    if (!fs.existsSync(sourceDir)) return;
    
    const domainFeatures = path.join(featuresDir, domain);
    fs.mkdirSync(domainFeatures, { recursive: true });
    
    const files = fs.readdirSync(sourceDir);
    const components = new Set(files.filter(f => f.endsWith('.tsx')).map(f => f.replace('.tsx', '')));
    
    for (const comp of components) {
        const folderName = comp.charAt(0).toLowerCase() + comp.slice(1);
        const compFolder = path.join(domainFeatures, folderName);
        fs.mkdirSync(compFolder, { recursive: true });
        
        ['.tsx', '.css'].forEach(ext => {
            const oldPath = path.join(sourceDir, comp + ext);
            if (fs.existsSync(oldPath)) {
                let content = fs.readFileSync(oldPath, 'utf8');
                if (ext === '.tsx') {
                    // Update relative imports pointing out of the folder. 
                    // e.g. from '../../context' -> from '../../../context'
                    // because we moved from src/pages/admin (depth 3) to src/features/admin/dashboard (depth 4)
                    content = content.replace(/from\s+['"]((?:\.\.\/)+)([^'"]+)['"]/g, (match, prefix, rest) => {
                        return `from '../${prefix}${rest}'`;
                    });
                }
                fs.writeFileSync(path.join(compFolder, comp + ext), content);
                fs.unlinkSync(oldPath);
            }
        });
    }
}

// move admin
moveAndFixImports(path.join(pagesDir, 'admin'), 'admin');
// move patient
moveAndFixImports(path.join(pagesDir, 'patient'), 'patient');
// move auth (Login)
if (fs.existsSync(path.join(pagesDir, 'Login.tsx'))) {
    moveAndFixImports(pagesDir, 'auth');
}

// Update App.tsx
let appContent = fs.readFileSync(path.join(srcDir, 'App.tsx'), 'utf8');

// Replace admin
appContent = appContent.replace(/import\s+([A-Za-z0-9_]+)\s+from\s+['"]\.\/pages\/admin\/([A-Za-z0-9_]+)['"]/g, (match, name, comp) => {
    const folderName = comp.charAt(0).toLowerCase() + comp.slice(1);
    return `import ${name} from './features/admin/${folderName}/${comp}'`;
});
// Replace patient
appContent = appContent.replace(/import\s+([A-Za-z0-9_]+)\s+from\s+['"]\.\/pages\/patient\/([A-Za-z0-9_]+)['"]/g, (match, name, comp) => {
    const folderName = comp.charAt(0).toLowerCase() + comp.slice(1);
    return `import ${name} from './features/patient/${folderName}/${comp}'`;
});
// Replace auth (Login)
appContent = appContent.replace(/import\s+([A-Za-z0-9_]+)\s+from\s+['"]\.\/pages\/Login['"]/g, (match, name) => {
    return `import ${name} from './features/auth/login/Login'`;
});

// Also replace lazy loading syntax: const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
appContent = appContent.replace(/import\(['"]\.\/pages\/admin\/([A-Za-z0-9_]+)['"]\)/g, (match, comp) => {
    const folderName = comp.charAt(0).toLowerCase() + comp.slice(1);
    return `import('./features/admin/${folderName}/${comp}')`;
});
appContent = appContent.replace(/import\(['"]\.\/pages\/patient\/([A-Za-z0-9_]+)['"]\)/g, (match, comp) => {
    const folderName = comp.charAt(0).toLowerCase() + comp.slice(1);
    return `import('./features/patient/${folderName}/${comp}')`;
});
appContent = appContent.replace(/import\(['"]\.\/pages\/Login['"]\)/g, (match) => {
    return `import('./features/auth/login/Login')`;
});

fs.writeFileSync(path.join(srcDir, 'App.tsx'), appContent);

// Remove empty directories if any
function cleanEmptyDirs(dir) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const files = fs.readdirSync(dir);
        if (files.length === 0) {
            fs.rmdirSync(dir);
        } else {
            for (const file of files) {
                cleanEmptyDirs(path.join(dir, file));
            }
            if (fs.readdirSync(dir).length === 0) {
                fs.rmdirSync(dir);
            }
        }
    }
}
cleanEmptyDirs(pagesDir);

console.log("Migration completed successfully!");
