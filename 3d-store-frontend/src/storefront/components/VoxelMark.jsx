import BrandLogo from './BrandLogo'
import './VoxelMark.css'

/** Compact brand symbol, also used in existing loading states. */
const VoxelMark = ({ size = 32, printing = false, loop = false, title = 'Özkan3D' }) => (
  <BrandLogo
    compact
    className={`sf-voxel ${printing ? 'is-printing' : ''} ${loop ? 'is-loop' : ''}`}
    style={{ width: size, height: size }}
    alt={title}
  />
)

export default VoxelMark
