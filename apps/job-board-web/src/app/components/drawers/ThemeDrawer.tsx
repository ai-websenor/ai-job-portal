import { Drawer, DrawerBody, DrawerContent, DrawerHeader, Button, addToast } from '@heroui/react';
import { themeColors } from '../../config/data';
import { DialogProps } from '@/app/types/types';
import { FaCheck } from 'react-icons/fa';
import { useState } from 'react';
import clsx from 'clsx';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import CommonUtils from '@/app/utils/commonUtils';

type ThemeType = (typeof themeColors)[0];

const ThemeDrawer = ({ isOpen, onClose }: DialogProps) => {
  const { getLocalStorage, setLocalStorage } = useLocalStorage();
  const currentThemeJson = getLocalStorage('app-theme');
  const currentTheme = currentThemeJson ? JSON.parse(currentThemeJson) : themeColors[0];

  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(currentTheme);

  const handleApplyTheme = () => {
    if (!selectedTheme.id) {
      addToast({
        title: 'Error',
        color: 'danger',
        description: 'Please select a theme',
      });
      return;
    }

    CommonUtils.applyTheme(selectedTheme);
    setLocalStorage('app-theme', JSON.stringify(selectedTheme));

    addToast({
      title: 'Success',
      color: 'success',
      description: 'Theme applied successfully',
    });

    onClose();
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={onClose} placement="right" size="xs">
      <DrawerContent>
        {() => (
          <>
            <DrawerHeader className="flex flex-col gap-1 pt-8 border-b">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">Theme Settings</span>
              </div>
              <p className="text-sm text-gray-500 font-normal mt-1">
                Personalize your experience with custom colors
              </p>
            </DrawerHeader>
            <DrawerBody className="pt-6">
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 px-1">
                    Select Accent Color
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {themeColors.map((theme) => {
                      const isSelected = selectedTheme.id === theme.id;
                      return (
                        <div
                          key={theme.id}
                          onClick={() => setSelectedTheme(theme)}
                          className={clsx(
                            'group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-300 border-2',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-transparent hover:border-gray-200 hover:bg-gray-50',
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-10 h-10 rounded-xl shadow-inner flex items-center justify-center transition-transform group-hover:scale-110"
                              style={{ backgroundColor: theme.colors.primary }}
                            >
                              {isSelected && <FaCheck className="text-white text-xs" />}
                            </div>
                            <div className="flex flex-col">
                              <span
                                className={clsx(
                                  'text-sm font-semibold transition-colors',
                                  isSelected ? 'text-primary' : 'text-gray-700',
                                )}
                              >
                                {theme.title}
                              </span>
                              <span className="text-xs text-gray-400">{theme.colors.primary}</span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 p-1 bg-white rounded-lg shadow-sm border border-gray-100">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: theme.colors.primary }}
                            />
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: theme.colors.secondary }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Pro Tip</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Changes will be applied instantly to your dashboard and profile. Feel free to
                    experiment!
                  </p>
                </div>
              </div>
            </DrawerBody>
            <div className="p-6 border-t mt-auto">
              <Button
                fullWidth
                color="primary"
                className="font-bold shadow-lg shadow-primary/20"
                onPress={handleApplyTheme}
              >
                Apply Changes
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default ThemeDrawer;
