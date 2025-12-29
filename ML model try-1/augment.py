import albumentations as A

augmenter = A.Compose([
    A.MotionBlur(blur_limit=3, p=0.3),
    A.GaussNoise(p=0.3),
    A.RandomBrightnessContrast(
        brightness_limit=0.2,
        contrast_limit=0.2,
        p=0.4
    ),
    A.Affine(
        rotate=(-5, 5),
        shear=(-5, 5),
        scale=(0.9, 1.1),
        p=0.4
    )
])
