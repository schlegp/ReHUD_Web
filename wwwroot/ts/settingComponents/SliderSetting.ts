import SettingComponent from "./SettingComponent";


export default class SliderSetting extends SettingComponent {
    public static override readonly elementName = 'slider-setting';

    private min: number;
    private max: number;
    private step: number;

    private slider: HTMLInputElement;
    private numberInput: HTMLInputElement;

    private lastValue: number;

    protected override _enable(): void {
        this.slider.disabled = false;
        this.numberInput.disabled = false;
    }
    protected override _disable(): void {
        this.slider.disabled = true;
        this.numberInput.disabled = true;
    }

    override connected() {
        this.min = parseFloat(this.getAttribute('min'));
        this.max = parseFloat(this.getAttribute('max'));
        this.step = parseFloat(this.getAttribute('step'));
        this.lastValue = this.value;

        requestAnimationFrame(() => {
            this.innerHTML = '';

            const label = document.createElement('label');
            label.innerText = this.text;

            const createInput = () => {
                const input = document.createElement('input');
                input.min = this.min.toString();
                input.max = this.max.toString();
                input.value = this.value.toString();
                input.step = this.step.toString();
                input.onkeydown = () => false;
                return input;
            };

            this.slider = createInput();
            this.slider.type = 'range';
            this.slider.classList.add('slider');

            this.numberInput = createInput();
            this.numberInput.type = 'number';

            const callback = (e: Event) => {
                this.onValueChange((e.target as HTMLInputElement).value);
            };
            this.slider.addEventListener('input', callback);
            this.numberInput.addEventListener('input', callback);

            this.appendChild(label);
            this.appendChild(this.slider);
            this.appendChild(this.numberInput);

            this.isDomInitialized = true;
        });
    }

    protected valueChange(val: string) {
        const valNum = parseFloat(val);
        if (valNum === this.lastValue) return;

        if (valNum < this.min) val = this.min.toString();
        if (valNum > this.max) val = this.max.toString();

        this.value = valNum;
        this.slider.value = val;
        this.numberInput.value = val;

        this.lastValue = valNum;
    }
}
