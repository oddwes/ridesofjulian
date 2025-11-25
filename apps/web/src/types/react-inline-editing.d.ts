declare module 'react-inline-editing' {
  import React from 'react';

  interface EditableLabelProps {
    text: string;
    labelClassName?: string;
    labelFontSize?: string;
    labelFontWeight?: string;
    inputMaxLength?: number;
    inputPlaceHolder?: string;
    inputWidth?: string;
    inputHeight?: string;
    inputFontSize?: string;
    inputFontWeight?: string;
    inputClassName?: string;
    inputBorderWidth?: string;
    isEditing?: boolean;
    emptyEdit?: boolean;
    labelPlaceHolder?: string;
    onFocus?: (text: string) => void;
    onFocusOut?: (text: string) => void;
  }

  const EditableLabel: React.ComponentType<EditableLabelProps>;

  export default EditableLabel;
} 