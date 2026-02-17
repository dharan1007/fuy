import React from 'react';
import Svg, { Path, Defs, ClipPath, G, Rect } from 'react-native-svg';

export const PoopIcon = ({ color }: { color: string }) => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
        <Path
            fillRule="evenodd"
            d="M12 2C10 2 8 4 8 6C8 7 8.5 8 9 9C6.5 9.5 5 11 5 13C5 14.5 6 15.5 7 16C5 17 4 19 5 20.5C5.5 21.5 6.5 22 8 22H16C17.5 22 18.5 21.5 19 20.5C20 19 19 17 17 16C18 15.5 19 14.5 19 13C19 11 17.5 9.5 15 9C15.5 8 16 7 16 6C16 4 14 2 12 2ZM9.5 14C10.3284 14 11 13.3284 11 12.5C11 11.6716 10.3284 11 9.5 11C8.67157 11 8 11.6716 8 12.5C8 13.3284 8.67157 14 9.5 14ZM14.5 14C15.3284 14 16 13.3284 16 12.5C16 11.6716 15.3284 11 14.5 11C13.6716 11 13 11.6716 13 12.5C13 13.3284 13.6716 14 14.5 14ZM12 18C14.5 18 15.5 16.5 15.5 16.5H8.5C8.5 16.5 9.5 18 12 18Z"
        />
    </Svg>
);

export const MagicCapIcon = ({ color }: { color: string }) => (
    <Svg width="20" height="20" viewBox="0 0 24 24">
        <Defs>
            <ClipPath id="cap-crown">
                <Path d="M12 4C15.5 4 18.5 6 19 9L19.5 14H4.5L5 9C5.5 6 8.5 4 12 4Z" />
            </ClipPath>
        </Defs>
        {/* Crown Base - Green */}
        <Path d="M12 4C15.5 4 18.5 6 19 9L19.5 14H4.5L5 9C5.5 6 8.5 4 12 4Z" fill="#15803d" />

        {/* Red Stripes */}
        <G clipPath="url(#cap-crown)">
            <Rect x="11" y="0" width="2" height="20" fill="#dc2626" />
            <Rect x="7" y="0" width="2" height="20" fill="#dc2626" rotation="-15" origin="7, 10" />
            <Rect x="15" y="0" width="2" height="20" fill="#dc2626" rotation="15" origin="15, 10" />
        </G>

        {/* Brim - Green */}
        <Path d="M21 14H3C2 14 2 16 4 17L6 18H18L20 17C22 16 22 14 21 14Z" fill="#15803d" opacity="0.9" />

        {/* Button - Red */}
        <Path d="M12 4V3" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
    </Svg>
);
